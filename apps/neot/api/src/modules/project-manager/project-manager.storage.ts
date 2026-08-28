import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, relative, resolve } from "node:path";
import { AppError } from "@neot/framework/errors";

export const projectManagerAttachmentLimitBytes = 2 * 1024 * 1024;
export const projectManagerAttachmentLimitPerRecord = 20;

type SupportedMimeType =
  | "application/pdf"
  | "image/gif"
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "text/plain";

export class ProjectManagerAttachmentStorage {
  constructor(
    private readonly root = resolve(
      process.env.NEOT_STORAGE_PATH ?? process.cwd(),
      "neot-attachments",
    ),
  ) {}

  async write(storageKey: string, data: Buffer) {
    const filePath = this.resolveKey(storageKey);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, data, { flag: "wx" });
  }

  async read(storageKey: string) {
    return readFile(this.resolveKey(storageKey));
  }

  async remove(storageKey: string) {
    try {
      await unlink(this.resolveKey(storageKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  private resolveKey(storageKey: string) {
    const filePath = resolve(this.root, storageKey);
    const relativePath = relative(this.root, filePath);
    if (
      !relativePath ||
      relativePath.startsWith("..") ||
      resolve(this.root, relativePath) !== filePath
    ) {
      throw AppError.validation("Attachment storage reference is invalid.");
    }
    return filePath;
  }
}

export function validateProjectManagerAttachment(
  data: Buffer,
  requestedMimeType: string,
  originalName: string,
) {
  if (!data.length) throw AppError.validation("Attachment file is empty.");
  if (data.byteLength > projectManagerAttachmentLimitBytes) {
    throw AppError.validation("Each attachment must be 2 MB or smaller.");
  }
  const detectedMimeType = detectMimeType(data, originalName);
  if (!detectedMimeType || detectedMimeType !== requestedMimeType) {
    throw AppError.validation(
      "Attachment must be a valid PNG, JPEG, WebP, GIF, PDF, or plain text file.",
    );
  }
  return {
    checksum: createHash("sha256").update(data).digest("hex"),
    extension: extensionFor(detectedMimeType),
    mimeType: detectedMimeType,
    originalName: cleanAttachmentName(originalName),
  };
}

export function cleanAttachmentName(value: string) {
  const withoutControls = [...basename(value.trim())]
    .map((character) => (character.charCodeAt(0) < 32 ? "-" : character))
    .join("");
  const fileName = withoutControls
    .replace(/[<>:"/\\|?*]/gu, "-")
    .replace(/\s+/gu, " ")
    .replace(/^\.+/u, "")
    .trim();
  if (!fileName) throw AppError.validation("Attachment filename is required.");
  return fileName.slice(0, 240);
}

function detectMimeType(
  data: Buffer,
  originalName: string,
): SupportedMimeType | null {
  if (
    data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff)
    return "image/jpeg";
  if (
    data.subarray(0, 4).toString("ascii") === "RIFF" &&
    data.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "image/webp";
  if (["GIF87a", "GIF89a"].includes(data.subarray(0, 6).toString("ascii")))
    return "image/gif";
  if (data.subarray(0, 5).toString("ascii") === "%PDF-")
    return "application/pdf";
  if (originalName.toLowerCase().endsWith(".txt") && isPlainText(data))
    return "text/plain";
  return null;
}

function isPlainText(data: Buffer) {
  if (data.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(data);
    return true;
  } catch {
    return false;
  }
}

function extensionFor(mimeType: SupportedMimeType) {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/gif") return "gif";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "txt";
}
