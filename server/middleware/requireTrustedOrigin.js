const { getAllowedOrigins, isAllowedOrigin, normalizeOrigin } = require("../lib/origins");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const originFromReferer = (referer) => {
  if (!referer) return "";
  try {
    return new URL(referer).origin;
  } catch {
    return "";
  }
};

/**
 * Cookie-authenticated browsers always send Origin (or Referer). Reject
 * cross-site mutating calls that would otherwise CSRF a SameSite=None cookie.
 * Server-side clients and tests with no Origin are allowed.
 */
const requireTrustedOrigin = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = normalizeOrigin(req.get("origin") || originFromReferer(req.get("referer")));
  if (!origin) return next();

  if (isAllowedOrigin(origin, getAllowedOrigins())) {
    return next();
  }

  return res.status(403).json({ message: "Untrusted request origin" });
};

module.exports = requireTrustedOrigin;
