const LOCAL_DEV_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:5239",
  "http://127.0.0.1:5239",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

const normalizeOrigin = (origin) =>
  String(origin || "")
    .trim()
    .replace(/\/$/, "");

const parseEnvOrigins = () =>
  (process.env.CORS_ORIGIN || "")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);

const getAllowedOrigins = () => {
  const fromEnv = parseEnvOrigins();
  if (process.env.NODE_ENV === "production") {
    return [...new Set(fromEnv)];
  }

  return [...new Set([...LOCAL_DEV_ORIGINS, ...fromEnv])];
};

const isAllowedOrigin = (origin, allowed = getAllowedOrigins()) => {
  if (!origin) return false;
  return allowed.includes(normalizeOrigin(origin));
};

module.exports = {
  getAllowedOrigins,
  isAllowedOrigin,
  normalizeOrigin,
};
