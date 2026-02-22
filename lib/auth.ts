import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const SESSION_COOKIE = "session";

function getAuthSecret() {
  return process.env.AUTH_SECRET ?? "dev-insecure-secret-change-me";
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) {
    return false;
  }

  const candidateHash = scryptSync(password, salt, 64).toString("hex");
  const hashBuffer = Buffer.from(hash, "hex");
  const candidateBuffer = Buffer.from(candidateHash, "hex");

  if (hashBuffer.length !== candidateBuffer.length) {
    return false;
  }

  return timingSafeEqual(hashBuffer, candidateBuffer);
}

function signValue(value: string) {
  return createHmac("sha256", getAuthSecret()).update(value).digest("hex");
}

export function createSessionToken(email: string) {
  const payload = Buffer.from(
    JSON.stringify({
      email,
      iat: Date.now(),
      nonce: randomBytes(8).toString("hex"),
    }),
  ).toString("base64url");

  const signature = signValue(payload);
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signValue(payload);
  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const actualBuffer = Buffer.from(signature, "hex");

  if (expectedBuffer.length !== actualBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(expectedBuffer, actualBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof parsed.email !== "string") {
      return null;
    }

    return { email: parsed.email as string };
  } catch {
    return null;
  }
}

export const sessionCookieName = SESSION_COOKIE;
