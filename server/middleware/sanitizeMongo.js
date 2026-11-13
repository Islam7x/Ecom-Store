const isPlainObject = (value) =>
  Boolean(value) && Object.getPrototypeOf(value) === Object.prototype;

const sanitize = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const clean = {};
  for (const [key, nested] of Object.entries(value)) {
    if (key.startsWith("$") || key.includes(".")) continue;
    clean[key] = sanitize(nested);
  }
  return clean;
};

const sanitizeMongo = (req, _res, next) => {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    req.body = sanitize(req.body);
  }
  next();
};

module.exports = sanitizeMongo;
