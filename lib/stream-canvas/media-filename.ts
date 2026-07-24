/**
 * Display filename for a media URL: the last path segment, percent-decoded
 * when possible. Tolerant of malformed escapes (returns the raw segment
 * instead of throwing).
 */
export function mediaFilenameFromUrl(url: string, fallback = "audio") {
  const segment = url.split("/").pop() || fallback;
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
