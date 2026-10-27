const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const safeSearchPattern = (value, maxLength = 100) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) {
    const error = new Error(`Search terms must be at most ${maxLength} characters`);
    error.status = 400;
    throw error;
  }
  return escapeRegExp(trimmed);
};

module.exports = { safeSearchPattern };
