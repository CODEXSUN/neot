import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { AppError } from "@neot/framework/errors";

export const ideaImageLimitBytes = 8 * 1024 * 1024;

export function ideaImageAccessToken(ideaUuid: string, attachmentUuid: string) {
  return createHmac("sha256", imageSigningSecret())
    .update(`${ideaUuid}:${attachmentUuid}`)
    .digest("hex");
}

export function hasValidIdeaImageAccess(
  ideaUuid: string,
  attachmentUuid: string,
  accessToken: string
) {
  const expected = Buffer.from(ideaImageAccessToken(ideaUuid, attachmentUuid), "hex");
  const received = Buffer.from(accessToken, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export class IdeaImageStorage {
  private readonly root = resolve(
    process.env.NEOT_STORAGE_PATH?.trim() || join(process.cwd(), "storage"),
    "ideas"
  );

  async write(ideaUuid: string, name: string, data: Buffer) {
    const storageKey = `${ideaUuid}/${cleanImageName(name)}`;
    const filePath = this.resolveKey(storageKey);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, data, { flag: "wx" }).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "EEXIST") throw error;
      throw AppError.conflict("An image with this name already exists for the idea.");
    });
    return storageKey;
  }

  read(storageKey: string) {
    return readFile(this.resolveKey(storageKey)).catch(() => {
      throw AppError.notFound("Idea image was not found in storage.");
    });
  }

  async remove(storageKey: string) {
    await unlink(this.resolveKey(storageKey)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }

  private resolveKey(storageKey: string) {
    const filePath = resolve(this.root, storageKey);
    const relativePath = relative(this.root, filePath);
    if (
      !relativePath ||
      relativePath.startsWith("..") ||
      resolve(this.root, relativePath) !== filePath
    ) {
      throw AppError.validation("Idea image storage reference is invalid.");
    }
    return filePath;
  }
}

export function validateIdeaImage(data: Buffer, mimeType: string, name: string) {
  if (!data.length) throw AppError.validation("The image file is empty.");
  if (data.byteLength > ideaImageLimitBytes) {
    throw AppError.validation("Images must be 8 MB or smaller.");
  }
  const detected = detectImageType(data);
  if (!detected || detected !== mimeType) {
    throw AppError.validation("The file must be a valid PNG, JPEG, WebP, or GIF image.");
  }
  return { mimeType: detected, name: cleanImageName(name) };
}

function cleanImageName(value: string) {
  const name = replaceInvalidImageNameCharacters(basename(value.trim()))
    .replace(/\s+/gu, "-")
    .replace(/^\.+/u, "")
    .slice(0, 180);
  if (!name) throw AppError.validation("The image filename is required.");
  return name;
}

function replaceInvalidImageNameCharacters(value: string) {
  const reserved = '<>:"/\\|?*';
  return Array.from(value, (character) =>
    character.charCodeAt(0) <= 0x1f || reserved.includes(character) ? "-" : character
  ).join("");
}

function detectImageType(data: Buffer) {
  if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return "image/png";
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "image/jpeg";
  if (
    data.subarray(0, 4).toString("ascii") === "RIFF" &&
    data.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "image/webp";
  if (["GIF87a", "GIF89a"].includes(data.subarray(0, 6).toString("ascii"))) return "image/gif";
  return null;
}

function imageSigningSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters to sign idea image URLs.");
  }
  return secret;
}
