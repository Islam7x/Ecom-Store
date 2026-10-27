// server/controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { verifyGoogleIdToken } = require("../lib/googleIdToken");

// Resolved once at module load — auth middleware guarantees JWT_SECRET exists
const JWT_SECRET = process.env.JWT_SECRET;

// Cookie config shared by login, register, and Google auth
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

/** Helper: sign JWT and attach as httpOnly cookie */
const sendTokenResponse = (res, user, extra = {}) => {
  const token = jwt.sign(
    { id: user._id, tv: user.tokenVersion || 0 },
    JWT_SECRET,
    { expiresIn: "30d" },
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

  const user = await User.findOne({ email }).select("+password +tokenVersion");
  if (!user || !user.password) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
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
  if (!user) {
    // Check if a user with that email already exists (registered via email)
    user = await User.findOne({ email });
    if (user) {
      // Link the Google account to the existing email account
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
