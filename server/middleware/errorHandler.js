const { captureException } = require("../config/sentry");

const errorHandler = (err, req, res, _next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);
  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }

  // Capture error in Sentry (with context)
  captureException(err, {
    method: req.method,
    url: req.originalUrl,
    userId: req.user?.id,
    userEmail: req.user?.email,
    ip: req.ip,
  });

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join("; ") });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue).join(", ");
    return res.status(409).json({ message: `Duplicate value for: ${field}` });
  }

  // Mongoose bad ObjectId
  if (err.name === "CastError" && err.kind === "ObjectId") {
    return res.status(400).json({ message: "Invalid ID format" });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    message:
      status >= 500 && process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message || "Internal Server Error",
  });
};

module.exports = errorHandler;
