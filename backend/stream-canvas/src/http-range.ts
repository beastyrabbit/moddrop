export type ByteRangeParseResult =
  | { kind: "none" }
  | { kind: "invalid" }
  | { kind: "range"; start: number; end: number; length: number };

function parseStrictNonNegativeInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsedValue = Number(value);
  if (!Number.isSafeInteger(parsedValue)) {
    return null;
  }

  return parsedValue;
}

function parseRangeBounds(
  startPart: string,
  endPart: string,
  fileSize: number,
): { start: number; end: number } | null {
  if (!startPart) {
    const suffixLength = parseStrictNonNegativeInteger(endPart);
    if (suffixLength === null || suffixLength <= 0) return null;
    return { start: Math.max(0, fileSize - suffixLength), end: fileSize - 1 };
  }

  const start = parseStrictNonNegativeInteger(startPart);
  const end = endPart ? parseStrictNonNegativeInteger(endPart) : fileSize - 1;
  if (start === null || end === null) return null;
  return { start, end: Math.min(end, fileSize - 1) };
}

export function parseSingleByteRange(
  rangeHeader: string | undefined,
  fileSize: number,
): ByteRangeParseResult {
  if (!rangeHeader) {
    return { kind: "none" };
  }

  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return { kind: "invalid" };
  }

  if (!rangeHeader.startsWith("bytes=")) {
    return { kind: "invalid" };
  }

  const [rawRange] = rangeHeader.slice("bytes=".length).split(",", 1);
  if (!rawRange) {
    return { kind: "invalid" };
  }

  const [rawStart, rawEnd] = rawRange.split("-", 2);
  const startPart = rawStart?.trim() ?? "";
  const endPart = rawEnd?.trim() ?? "";

  if (!startPart && !endPart) {
    return { kind: "invalid" };
  }

  const bounds = parseRangeBounds(startPart, endPart, fileSize);
  if (!bounds) return { kind: "invalid" };
  const { start, end } = bounds;

  if (start >= fileSize || end < start) {
    return { kind: "invalid" };
  }

  return {
    kind: "range",
    start,
    end,
    length: end - start + 1,
  };
}
