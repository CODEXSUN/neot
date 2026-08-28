import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt } from "node:crypto";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function generateSyncToken() {
  return Array.from({ length: 16 }, () => alphabet[randomInt(alphabet.length)]).join("");
}

export function syncTokenHash(token: string) {
  return createHash("sha256")
    .update(`${token}:${requiredSecret("NEOT_SYNC_TOKEN_PEPPER")}`)
    .digest("hex");
}

export function encryptSyncToken(token: string) {
  const key = encryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url")
  ].join(".");
}

export function decryptSyncToken(value: string) {
  const [version, ivValue, tagValue, ciphertextValue] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !ciphertextValue) {
    throw new Error("Stored NEOT sync token is invalid.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

export function snapshotChecksum(payload: string) {
  return createHash("sha256").update(payload).digest("hex");
}

function encryptionKey() {
  return createHash("sha256").update(requiredSecret("NEOT_SYNC_ENCRYPTION_KEY")).digest();
}

function requiredSecret(name: string) {
  const value = process.env[name]?.trim() || process.env.JWT_SECRET?.trim();
  if (!value || value.length < 32) {
    throw new Error(`${name} or JWT_SECRET must contain at least 32 characters.`);
  }
  return value;
}
