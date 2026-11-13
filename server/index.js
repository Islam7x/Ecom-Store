const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");

// ── Sentry MUST be initialized first ────────
const { initSentry, flush: sentrylush } = require("./config/sentry");

const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const { isRedisConnected } = require("./middleware/cache");
const { startBackgroundJobs, stopBackgroundJobs } = require("./lib/jobs");
const { metricsEndpoint } = require("./middleware/validationLogger");
const { protect } = require("./middleware/auth");
const requireAdmin = require("./middleware/admin");
const { getAllowedOrigins } = require("./lib/origins");
const requireTrustedOrigin = require("./middleware/requireTrustedOrigin");
const sanitizeMongo = require("./middleware/sanitizeMongo");
const logger = require("./lib/logger");
const {
  healthCheckMiddleware,
  deepHealthCheck,
} = require("./middleware/healthCheck");

// ── Route modules ────────────────────────────

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const checkoutRoutes = require("./routes/checkout");
const webhookRoutes = require("./routes/webhook");
const orderRoutes = require("./routes/orders");
const addressRoutes = require("./routes/addresses");
const locationRoutes = require("./routes/locations");
const adminProductRoutes = require("./routes/admin/products");
const adminOrderRoutes = require("./routes/admin/orders");
const adminDashboardRoutes = require("./routes/admin/dashboard");
const adminUserRoutes = require("./routes/admin/users");
const cartRoutes = require("./routes/cart");
const couponRoutes = require("./routes/coupons");
const adminCouponRoutes = require("./routes/admin/coupons");

// ── Validate required env vars ───────────────
const required = ["JWT_SECRET", "STRIPE_SECRET_KEY"];
if (process.env.NODE_ENV === "production") {
  required.push("MONGO_URI", "STRIPE_WEBHOOK_SECRET", "CORS_ORIGIN", "CLIENT_URL");
}
for (const key of required) {
  if (!process.env[key]) {
    console.error(`FATAL: ${key} environment variable is not set.`);
    process.exit(1);
  }
}

const app = express();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

initSentry(app);

const allowedOrigins = getAllowedOrigins();
logger.info("CORS allowlist loaded", { origins: allowedOrigins });

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// ── Webhook route MUST come before express.json() ──
// Stripe requires the raw body for signature verification.
app.use("/api/webhook", webhookRoutes);

// ── Common middleware ────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(sanitizeMongo);
app.use(requireTrustedOrigin);

// Configure helmet with proper COOP settings for Google OAuth
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === "test" ? 5000 : 300,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === "/health",
  }),
);

// Request logging
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// ── Health check ─────────────────────────────
app.get("/health", healthCheckMiddleware);

// ── Deep health check (for monitoring dashboards) ──
app.get("/api/admin/health/deep", protect, requireAdmin, async (req, res) => {
  try {
    const result = await deepHealthCheck();
    res.status(result.status === "healthy" ? 200 : 503).json(result);
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// ── Validation metrics endpoint (admin only) ──
app.get(
  "/api/admin/metrics/validation",
  protect,
  requireAdmin,
  (req, res, _next) => {
    metricsEndpoint(req, res);
  },
);

// ── API routes ───────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/coupons", couponRoutes);

// ── Admin routes ─────────────────────────────
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/coupons", adminCouponRoutes);

// ── Global error handler (must be last) ──────
app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});
app.use(errorHandler);

// ── Start server ─────────────────────────────
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
  connectDB().then(() => {
    startBackgroundJobs();

    app.listen(PORT, () => {
      logger.info("API listening", {
        port: PORT,
        env: process.env.NODE_ENV || "development",
        redis: isRedisConnected(),
      });
    });
  });
}

// ── Graceful shutdown ────────────────────────
const shutdown = async (signal) => {
  console.log(`\n${signal} received — shutting down gracefully…`);

  stopBackgroundJobs();

  // Flush Sentry events
  await sentrylush(2000).catch(() => {});

  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

module.exports = app; // Exported for testing with supertest
