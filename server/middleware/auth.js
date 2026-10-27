const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set.');
  process.exit(1);
}

const protect = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, please login' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password +tokenVersion");
    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }
    if ((decoded.tv || 0) !== (req.user.tokenVersion || 0)) {
      return res.status(401).json({ message: "Session is no longer valid" });
    }
    next();
  } catch {
    res.status(401).json({ message: 'Token expired or invalid' });
  }
};

module.exports = { protect, JWT_SECRET };
