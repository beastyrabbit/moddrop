export const MAX_USERNAME_LENGTH = 30;
export const MAX_RESOLVE_USERS = 50;
const MAX_CLERK_USER_ID_LENGTH = 128;

/** Keep letters, digits, `_`, and `-`, without leading or trailing separators. */
export function sanitizeUsername(raw: string): string {
  const allowed = raw.replace(/[^a-zA-Z0-9_-]/g, "");
  let start = 0;
  let end = allowed.length;
  while (start < end && (allowed[start] === "-" || allowed[start] === "_")) {
    start += 1;
  }
  while (
    end > start &&
    (allowed[end - 1] === "-" || allowed[end - 1] === "_")
  ) {
    end -= 1;
  }
  return allowed.slice(start, end).slice(0, MAX_USERNAME_LENGTH);
}

export function usernameSearchKey(username: string): string {
  return username.toLowerCase();
}

export function normalizeUsernamePrefix(prefix: string): string {
  return prefix.trim().toLowerCase().slice(0, MAX_USERNAME_LENGTH);
}

/** Escape LIKE wildcards so `_` in a prefix matches only a literal underscore. */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, String.raw`\$&`);
}

export function normalizeClerkUserIdList(userIds: readonly string[]): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const userId of userIds) {
    const trimmed = userId.trim();
    if (
      !trimmed ||
      trimmed.length > MAX_CLERK_USER_ID_LENGTH ||
      seen.has(trimmed)
    ) {
      continue;
    }
    seen.add(trimmed);
    normalized.push(trimmed);
    if (normalized.length >= MAX_RESOLVE_USERS) break;
  }

  return normalized;
}
