import { basename, extname } from "node:path";

export const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "audio/webm",
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
    return sniffWebMMime(buffer);
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

function sniffWebMMime(buffer: Buffer): "video/webm" | "audio/webm" {
  let sawAudioTrack = false;
  const scanLimit = Math.min(buffer.length - 2, 64 * 1024);

  for (let offset = 4; offset < scanLimit; offset += 1) {
    if (buffer[offset] !== 0x83) continue;

    const size = readEbmlVint(buffer, offset + 1, true);
    if (!size || size.value < 1 || size.value > 8) continue;

    const valueOffset = offset + 1 + size.length;
    const valueEnd = valueOffset + size.value;
    if (valueEnd > buffer.length) continue;

    const trackType = readUnsignedInt(buffer.subarray(valueOffset, valueEnd));
    if (trackType === 1) return "video/webm";
    if (trackType === 2) sawAudioTrack = true;
  }

  return sawAudioTrack ? "audio/webm" : "video/webm";
}

function readEbmlVint(
  buffer: Buffer,
  offset: number,
  maskMarkerBit: boolean,
): { value: number; length: number } | null {
  const firstByte = buffer[offset];
  if (firstByte === undefined || firstByte === 0) return null;

  let marker = 0x80;
  let length = 1;
  while (length <= 8 && (firstByte & marker) === 0) {
    marker >>= 1;
    length += 1;
  }
  if (length > 8 || offset + length > buffer.length) return null;

  let value = maskMarkerBit ? firstByte & (marker - 1) : firstByte;
  for (let index = 1; index < length; index += 1) {
    value = value * 256 + (buffer[offset + index] ?? 0);
  }
  return { value, length };
}

function readUnsignedInt(buffer: Buffer): number {
  let value = 0;
  for (const byte of buffer) {
    value = value * 256 + byte;
  }
  return value;
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
  buffer: Buffer,
  mimeType: string,
): { ok: true } | { ok: false; error: string } {
  if (!ALLOWED_UPLOAD_MIME_TYPES.has(mimeType)) {
    return { ok: false, error: "File type not allowed" };
  }

  if (!hasMinimumMediaStructure(buffer, mimeType)) {
    return { ok: false, error: "File appears to be truncated" };
  }

  return { ok: true };
}

function hasMinimumMediaStructure(buffer: Buffer, mimeType: string): boolean {
  switch (mimeType) {
    case "image/png":
      return (
        buffer.length >= 24 &&
        buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) &&
        buffer.subarray(12, 16).toString("ascii") === "IHDR"
      );
    case "image/gif":
      return buffer.length >= 10;
    case "image/webp":
    case "video/mp4":
    case "video/webm":
    case "audio/webm":
      return buffer.length >= 12;
    case "audio/ogg":
      return buffer.length >= 27;
    case "audio/wav":
      return buffer.length >= 44;
    case "audio/mpeg":
      return buffer.length >= 4;
    case "image/jpeg":
      return buffer.length >= 4;
    default:
      return false;
  }
}
