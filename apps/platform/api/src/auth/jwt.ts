import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { env } from "../env.js";

export type AuthTokenPayload = {
  aud: "neot";
  email: string;
  exp: number;
  iat: number;
  iss: "neot-api";
  jti: string;
  name?: string;
  sessionIssuedAt: string;
  role?: string;
  permissions?: string[];
  userId: string;
};

export function signAuthToken(
  input: Omit<AuthTokenPayload, "aud" | "exp" | "iat" | "iss" | "jti" | "sessionIssuedAt">
) {
  const now = Math.floor(Date.now() / 1000);
  const payload: AuthTokenPayload = {
    ...input,
    aud: "neot",
    exp: now + 60 * 60 * 4,
    iat: now,
    iss: "neot-api",
    jti: randomUUID(),
    sessionIssuedAt: new Date(now * 1000).toISOString()
  };

  const header = { alg: "HS256", typ: "JWT" };
  const head = base64Url(JSON.stringify(header));
  const body = base64Url(JSON.stringify(payload));
  const signature = sign(`${head}.${body}`);
  return `${head}.${body}.${signature}`;
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [head, body, signature] = parts as [string, string, string];
  const expected = sign(`${head}.${body}`);
  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AuthTokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.iss !== "neot-api" || payload.aud !== "neot" || payload.exp <= now) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function sign(value: string) {
  return createHmac("sha256", env.JWT_SECRET).update(value).digest("base64url");
}

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
