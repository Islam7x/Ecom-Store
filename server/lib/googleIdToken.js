const crypto = require("crypto");

const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
let cachedKeys = new Map();
let cacheExpiresAt = 0;

const tokenError = (message, status = 401) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const decodePart = (part) => {
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch {
    throw tokenError("Invalid Google credential");
  }
};

const cacheDuration = (response) => {
  const match = response.headers.get("cache-control")?.match(/max-age=(\d+)/);
  return (match ? Number(match[1]) : 3600) * 1000;
};

async function getSigningKey(kid) {
  if (!cachedKeys.has(kid) || cacheExpiresAt <= Date.now()) {
    let response;
    try {
      response = await fetch(GOOGLE_JWKS_URL, { signal: AbortSignal.timeout(5000) });
    } catch {
      throw tokenError("Unable to verify Google sign-in at this time", 503);
    }

    if (!response.ok) {
      throw tokenError("Unable to verify Google sign-in at this time", 503);
    }

    const payload = await response.json();
    cachedKeys = new Map((payload.keys || []).map((key) => [key.kid, key]));
    cacheExpiresAt = Date.now() + cacheDuration(response);
  }

  return cachedKeys.get(kid);
}

async function verifyGoogleIdToken(credential) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw tokenError("Google sign-in is not configured", 503);
  }

  if (typeof credential !== "string") throw tokenError("Invalid Google credential");
  const parts = credential.split(".");
  if (parts.length !== 3) throw tokenError("Invalid Google credential");

  const header = decodePart(parts[0]);
  const payload = decodePart(parts[1]);
  if (header.alg !== "RS256" || !header.kid) {
    throw tokenError("Invalid Google credential");
  }

  const signingKey = await getSigningKey(header.kid);
  if (!signingKey) throw tokenError("Google credential signing key is unavailable");

  const validSignature = crypto.verify(
    "RSA-SHA256",
    Buffer.from(`${parts[0]}.${parts[1]}`),
    crypto.createPublicKey({ key: signingKey, format: "jwk" }),
    Buffer.from(parts[2], "base64url"),
  );
  if (!validSignature) throw tokenError("Invalid Google credential");

  const now = Math.floor(Date.now() / 1000);
  const issuerIsGoogle =
    payload.iss === "accounts.google.com" ||
    payload.iss === "https://accounts.google.com";
  if (
    !issuerIsGoogle ||
    payload.aud !== clientId ||
    !payload.sub ||
    payload.exp <= now ||
    payload.iat > now + 60 ||
    (payload.email_verified !== true && payload.email_verified !== "true") ||
    !payload.email
  ) {
    throw tokenError("Google credential is invalid or expired");
  }

  return {
    googleId: payload.sub,
    email: String(payload.email).toLowerCase(),
    name: typeof payload.name === "string" ? payload.name : "",
    picture: typeof payload.picture === "string" ? payload.picture : "",
  };
}

module.exports = { verifyGoogleIdToken };
