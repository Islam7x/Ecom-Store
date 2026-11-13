// server/routes/auth.js
const express = require("express");
const rateLimit = require("express-rate-limit");
const Joi = require("joi");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/authController");

const router = express.Router();

// ── Validation schemas ───────────────────────

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Password must be at least 8 characters and include a letter and a number",
    }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const googleSchema = Joi.object({
  credential: Joi.string().min(100).max(4096).required(),
});

const profileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).optional(),
  picture: Joi.string().uri({ scheme: ["https", "http"] }).allow("").optional(),
});

const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const passwordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(passwordPattern)
    .required()
    .messages({
      "string.pattern.base":
        "Password must be at least 8 characters and include a letter and a number",
    }),
});

const forgotSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetSchema = Joi.object({
  token: Joi.string().hex().length(64).required(),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(passwordPattern)
    .required()
    .messages({
      "string.pattern.base":
        "Password must be at least 8 characters and include a letter and a number",
    }),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: "Too many sign-in attempts. Please try again later." },
});

// ── Routes ───────────────────────────────────

router.post("/register", authLimiter, validate(registerSchema), ctrl.register);
router.post("/login", authLimiter, validate(loginSchema), ctrl.login);
router.post("/google", authLimiter, validate(googleSchema), ctrl.googleAuth);
router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotSchema),
  ctrl.forgotPassword,
);
router.post(
  "/reset-password",
  authLimiter,
  validate(resetSchema),
  ctrl.resetPassword,
);
router.post("/logout", ctrl.logout);
router.get("/me", protect, ctrl.getMe);
router.put("/profile", protect, validate(profileSchema), ctrl.updateProfile);
router.put("/password", protect, validate(passwordSchema), ctrl.changePassword);

module.exports = router;
