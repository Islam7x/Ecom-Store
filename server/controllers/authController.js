// server/controllers/authController.js
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { verifyGoogleIdToken } = require("../lib/googleIdToken");
const { sendMail } = require("../lib/mailer");
const logger = require("../lib/logger");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const DUMMY_PASSWORD_HASH =
  "$2a$04$abcdefghijklmnopqrstuvuC9p0s1t2u3v4w5x6y7z8a9b0c1d2e";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
  maxAge: SESSION_MS,
};

const sendTokenResponse = (res, user, extra = {}) => {
  const token = jwt.sign(
    { id: user._id, tv: user.tokenVersion || 0 },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  );

  res.cookie("token", token, cookieOptions).json({
    ...extra,
    _id: user._id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    isAdmin: user.isAdmin,
  });
};

// ──────────────────────────────────────────────
// POST /api/auth/register
// ──────────────────────────────────────────────
exports.register = async (req, res) => {
  const { name, password } = req.body;
  const email = req.body.email.toLowerCase();

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ message: "Email is already registered" });
  }

  const user = await User.create({ name, email, password });
  sendTokenResponse(res, user);
};

// ──────────────────────────────────────────────
// POST /api/auth/login
// ──────────────────────────────────────────────
exports.login = async (req, res) => {
  const { password } = req.body;
  const email = req.body.email.toLowerCase();

  const user = await User.findOne({ email }).select(
    "+password +tokenVersion",
  );
  const hash = user?.password || DUMMY_PASSWORD_HASH;
  const isMatch = await bcrypt.compare(password, hash).catch(() => false);

  if (!user || !user.password || !isMatch || user.isActive === false) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  sendTokenResponse(res, user);
};

// ──────────────────────────────────────────────
// POST /api/auth/google
// ──────────────────────────────────────────────
exports.googleAuth = async (req, res) => {
  const { googleId, email, name, picture } = await verifyGoogleIdToken(
    req.body.credential,
  );

  let user = await User.findOne({ googleId });
  if (user?.isActive === false) {
    return res.status(401).json({ message: "Account is disabled" });
  }
  if (!user) {
    // Check if a user with that email already exists (registered via email)
    user = await User.findOne({ email });
    if (user) {
      if (user.isActive === false) {
        return res.status(401).json({ message: "Account is disabled" });
      }
      user.googleId = googleId;
      user.picture = picture || user.picture;
      user.name = name || user.name;
      await user.save();
    } else {
      user = await User.create({ googleId, email, name, picture });
    }
  } else {
    user.name = name || user.name;
    user.picture = picture || user.picture;
    await user.save();
  }

  sendTokenResponse(res, user);
};

// ──────────────────────────────────────────────
// POST /api/auth/logout
// ──────────────────────────────────────────────
exports.logout = (_req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: 0,
  });
  res.json({ message: "Logged out successfully" });
};

// ──────────────────────────────────────────────
// GET /api/auth/me
// ──────────────────────────────────────────────
exports.getMe = (req, res) => {
  res.json({
    _id: req.user._id,
    email: req.user.email,
    name: req.user.name,
    picture: req.user.picture,
    isAdmin: req.user.isAdmin,
  });
};

// ──────────────────────────────────────────────
// PUT /api/auth/profile
// ──────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  const { name, picture } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (name) user.name = name;
  if (picture) user.picture = picture;

  await user.save();
  res.json({
    _id: user._id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    isAdmin: user.isAdmin,
  });
};

// ──────────────────────────────────────────────
// PUT /api/auth/password
// ──────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Google-only users don't have a password
  if (!user.password) {
    return res
      .status(400)
      .json({ message: "Account uses Google login — no password to change" });
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Current password is incorrect" });
  }

  user.password = newPassword; // pre-save hook will hash it
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  sendTokenResponse(res, user, { message: "Password updated successfully" });
};

exports.forgotPassword = async (req, res) => {
  const email = req.body.email.toLowerCase();
  const user = await User.findOne({ email, isActive: { $ne: false } }).select(
    "+passwordResetToken +passwordResetExpires",
  );

  if (user) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(
      /\/$/,
      "",
    );
    const resetUrl = `${clientUrl}/reset-password?token=${rawToken}`;

    let delivery;
    try {
      delivery = await sendMail({
        to: user.email,
        subject: "Reset your password",
        text: `Reset your password using this link (valid for 1 hour): ${resetUrl}`,
        html: `<p>Reset your password using this link (valid for 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      });
    } catch (error) {
      logger.error("Password reset email failed", {
        userId: user._id.toString(),
        error: error.message,
      });
    }

    if (!delivery || delivery.skipped) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      logger.warn("Password reset email was not delivered", {
        userId: user._id.toString(),
      });
    }
  }

  res.json({
    message:
      "If that email is registered and email delivery is available, a reset link will be sent.",
  });
};

exports.resetPassword = async (req, res) => {
  const hashed = crypto
    .createHash("sha256")
    .update(req.body.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpires: { $gt: new Date() },
    isActive: { $ne: false },
  }).select("+password +tokenVersion +passwordResetToken +passwordResetExpires");

  if (!user) {
    return res.status(400).json({ message: "Reset link is invalid or expired" });
  }

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  sendTokenResponse(res, user, { message: "Password reset successfully" });
};
