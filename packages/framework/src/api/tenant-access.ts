import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "../errors/app-error.js";

export type PlatformAccessClaims = {
  aud?: string;
  email?: string;
  exp?: number;
  iss?: string;
  name?: string;
  sessionIssuedAt?: string;
  tenantCode?: string;
  tenantDbName?: string;
  tenantId?: string;
  tenantUuid?: string;
  userId?: string;
  userType?: string;
};

export type PlatformUserType = "super_admin" | "staff" | "tenant";

export function requirePlatformAccess(input: {
  allowedUserTypes?: readonly PlatformUserType[];
  authorization: string | string[] | undefined;
  secret: string;
}) {
  const authorization = headerValue(input.authorization);
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw AppError.unauthorized("Platform authentication is required.");

  const claims = verify(token, input.secret);
  if (!claims) throw AppError.unauthorized("Platform session is invalid or expired.");
  if (
    input.allowedUserTypes &&
    !input.allowedUserTypes.includes(claims.userType as PlatformUserType)
  ) {
    throw AppError.forbidden("This Platform session cannot access the requested application desk.");
  }
  return claims;
}

export function requireTenantAccess(input: {
  authorization: string | string[] | undefined;
  secret: string;
  tenantDatabase: string;
  tenantId: string | string[] | undefined;
}) {
  const tenantId = headerValue(input.tenantId);
  if (!tenantId) throw AppError.unauthorized("Tenant authentication is required.");

  const claims = requirePlatformAccess({
    allowedUserTypes: ["tenant"],
    authorization: input.authorization,
    secret: input.secret
  });
  if (
    claims.userType !== "tenant" ||
    claims.tenantId !== tenantId ||
    claims.tenantDbName !== input.tenantDatabase
  ) {
    throw AppError.forbidden("Tenant session does not match the requested tenant database.");
  }
  return claims;
}

function verify(token: string, secret: string): PlatformAccessClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [head, body, signature] = parts as [string, string, string];
  const expected = createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  if (!safeEqual(signature, expected)) return null;
  try {
    const claims = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as PlatformAccessClaims;
    if (
      claims.iss !== "codexsun-platform-api" ||
      claims.aud !== "codexsun-platform" ||
      typeof claims.exp !== "number" ||
      claims.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

function headerValue(value: string | string[] | undefined) {
  const selected = Array.isArray(value) ? value[0] : value;
  return selected?.trim() || undefined;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
