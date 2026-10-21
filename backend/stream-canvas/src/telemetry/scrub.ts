// Shared by both servers and the browser. Keep this module free of SDK/runtime imports.
const privateKeys = new Set([
  "user",
  "users",
  "email",
  "ip_address",
  "ip",
  "username",
  "displayname",
  "avatar",
  "authorization",
  "cookie",
  "cookies",
  "headers",
  "data",
  "body",
  "extra",
  "vars",
  "args",
]);

function isPrivateKey(key: string) {
  const lower = key.toLowerCase();
  return (
    privateKeys.has(lower) ||
    ["token", "secret", "password"].some((part) => lower.includes(part))
  );
}

export function safePath(value: string): string {
  try {
    const url = new URL(value, "https://redacted.invalid");
    // Route names are useful; room, upload, identity and arbitrary path values are not.
    const path = url.pathname
      .replace(/\/(rooms|uploads|users)\/[^/]+(?:\/.*)?/g, "/$1/[redacted]")
      .split("/")
      .map((segment) =>
        segment.includes("@") || segment.includes("%40")
          ? "[redacted]"
          : segment,
      )
      .join("/")
      .replace(
        /\b(?:user_[\w-]+|[0-9a-f]{8}-[0-9a-f-]{27,}|[a-z0-9]{20,})\b/gi,
        "[redacted]",
      );
    return path;
  } catch {
    return "[redacted]";
  }
}

export function safeDescription(value: string): string {
  // Keep HTTP methods and operation labels, but sanitize every embedded path.
  return scrubText(value.replace(/(?:https?:\/\/|\/)[^\s"'<>)]*/gi, safePath));
}

export function scrubText(value: string): string {
  const text = value
    .replace(/(\bparams:)[\s\S]*/gi, "$1 [redacted]")
    .replace(/(?:https?|wss?):\/\/[^\s<>"')]+/gi, (url) => {
      try {
        const parsed = new URL(url);
        return `${parsed.protocol}//${parsed.host}${safePath(url)}`;
      } catch {
        return "[redacted]";
      }
    })
    .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\beyJ[\w-]+(?:\.[\w-]+){1,2}\b/g, "[redacted]")
    // Scan disjoint tokens/domains once, rather than retrying at each character.
    .replace(/[\w.+%@-]+/g, scrubEmailToken)
    .replace(/\/[^\s'"<>]*/g, (path) => path.split(/[?#]/, 1)[0] ?? "");
  return scrubAssignments(text).slice(0, 2_000);
}

function scrubEmailToken(token: string) {
  const domains = token.split(/@|%40/).slice(1);
  return domains.some(hasEmailDomain) ? "[redacted]" : token;
}

function hasEmailDomain(value: string) {
  const domain = /^[\w.-]+/.exec(value)?.[0] ?? "";
  return /\.[a-z]{2,}\b/i.test(domain);
}

function isSensitiveAssignment(key: string) {
  const lower = key.toLowerCase();
  return (
    ["email", "code", "authorization"].includes(lower) ||
    ["token", "secret", "password", "key"].some((part) => lower.endsWith(part))
  );
}

function assignmentValueStart(text: string, offset: number) {
  while (/\s/.test(text.charAt(offset)) && offset < text.length) offset++;
  if (text[offset] !== ":" && text[offset] !== "=") return -1;
  offset++;
  while (/\s/.test(text.charAt(offset)) && offset < text.length) offset++;
  return offset;
}

function assignmentValueEnd(text: string, start: number) {
  const quote = text[start];
  if (quote === '"' || quote === "'") {
    const end = text.indexOf(quote, start + 1);
    // An unterminated quoted secret must also be removed.
    return end === -1 ? text.length : end + 1;
  }
  let end = start;
  while (end < text.length && !/[\s&#"']/.test(text.charAt(end))) end++;
  return end;
}

function scrubAssignments(text: string) {
  const keys = /\w+/g;
  const parts: string[] = [];
  let copied = 0;
  for (let match = keys.exec(text); match; match = keys.exec(text)) {
    if (!isSensitiveAssignment(match[0])) continue;
    const start = assignmentValueStart(text, keys.lastIndex);
    if (start === -1) continue;
    const end = assignmentValueEnd(text, start);
    if (end === start) continue;
    parts.push(text.slice(copied, start), "[redacted]");
    copied = end;
    keys.lastIndex = end;
  }
  return parts.join("") + text.slice(copied);
}

function clean(value: unknown, depth: number): unknown {
  if (depth > 18) return "[redacted]";
  if (typeof value === "string") return scrubText(value);
  if (Array.isArray(value)) return value.map((item) => clean(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, item]) => {
        if (isPrivateKey(key)) return [];
        if (
          /^(transaction|description)$/i.test(key) &&
          typeof item === "string"
        ) {
          return [[key, safeDescription(item)]];
        }
        if (/^(url|referrer|referer)$/i.test(key) && typeof item === "string") {
          return [[key, safePath(item)]];
        }
        return [[key, clean(item, depth + 1)]];
      }),
    );
  }
  return value;
}

export function scrubTelemetry<T>(value: T): T {
  // Only removes fields or replaces strings, preserving the SDK event shape.
  return clean(value, 0) as T;
}
