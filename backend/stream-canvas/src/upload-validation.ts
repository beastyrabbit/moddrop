import { basename, extname } from "node:path";

export const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
]);

const FALLBACK_FILENAME = "upload";

export function sniffUploadMime(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) {
    return "image/png";
  }

  const firstSix = buffer.subarray(0, 6).toString("ascii");
  if (firstSix === "GIF87a" || firstSix === "GIF89a") {
    return "image/gif";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(4, 8).toString("ascii") === "ftyp"
  ) {
    return "video/mp4";
  }

  if (buffer.subarray(0, 4).equals(Buffer.from("1a45dfa3", "hex"))) {
    return "video/webm";
  }

  if (buffer.subarray(0, 4).toString("ascii") === "OggS") {
    return "audio/ogg";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WAVE"
  ) {
    return "audio/wav";
  }

  if (
    buffer.subarray(0, 3).toString("ascii") === "ID3" ||
    (buffer[0] === 0xff &&
      buffer[1] !== undefined &&
      (buffer[1] & 0xe0) === 0xe0)
  ) {
    return "audio/mpeg";
  }

  return null;
}

export function sanitizeUploadFilename(filename: string): string {
  const extension = extname(filename).slice(0, 12);
  const base = basename(filename, extension)
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[-_.]+|[-_.]+$/g, "")
    .slice(0, 96);

  const safeBase = base.length > 0 ? base : FALLBACK_FILENAME;
  const safeExtension = extension
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9.]/g, "")
    .slice(0, 12);

  return `${safeBase}${safeExtension}`;
}

export function validateUploadedMedia(
  _buffer: Buffer,
  mimeType: string,
): { ok: true } | { ok: false; error: string } {
  if (!ALLOWED_UPLOAD_MIME_TYPES.has(mimeType)) {
    return { ok: false, error: "File type not allowed" };
  }

  return { ok: true };
}
