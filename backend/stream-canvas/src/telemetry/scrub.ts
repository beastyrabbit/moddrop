// Shared by both servers and the browser. Keep this module free of SDK/runtime imports.
const privateKey =
  /^(user|users|email|ip_address|ip|username|displayName|avatar|authorization|cookie|cookies|headers|.*(?:token|secret|password).*|data|body|extra|vars|args)$/i;

export function safePath(value: string): string {
  try {
    const url = new URL(value, "https://redacted.invalid");
    // Route names are useful; room, upload, identity and arbitrary path values are not.
    const path = url.pathname
      .replace(/\/(rooms|uploads|users)\/[^/]+(?:\/.*)?/g, "/$1/[redacted]")
      .replace(/[^/]*(?:@|%40)[^/]*/gi, "[redacted]")
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
  return value
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
    .replace(/\b[\w.+%-]+(?:@|%40)[\w.-]+\.[a-z]{2,}\b/gi, "[redacted]")
    .replace(/(\/[^\s?'"<>]*)[?#][^\s'"<>]*/g, "$1")
    .replace(
      /((?:[?&#]|\b)(?:[\w-]*(?:token|secret|password|key)|email|code|authorization)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s&#"']+)/gi,
      "$1[redacted]",
    )
    .slice(0, 2_000);
}

function clean(value: unknown, depth: number): unknown {
  if (depth > 18) return "[redacted]";
  if (typeof value === "string") return scrubText(value);
  if (Array.isArray(value)) return value.map((item) => clean(item, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, item]) => {
        if (privateKey.test(key)) return [];
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
