import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export function encryptTelegramSession(session: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(session, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptTelegramSession(value: string) {
  const [version, ivValue, tagValue, ciphertextValue] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !ciphertextValue) throw new Error("Stored Telegram session is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64url")), decipher.final()]).toString("utf8");
}

function encryptionKey() {
  const secret = process.env.TELEGRAM_SESSION_ENCRYPTION_KEY?.trim() || process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < 32) throw new Error("TELEGRAM_SESSION_ENCRYPTION_KEY or JWT_SECRET must contain at least 32 characters.");
  return createHash("sha256").update(secret).digest();
}
