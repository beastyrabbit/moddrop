interface RateLimitOptions {
  windowMs: number;
  max: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export class FixedWindowRateLimit {
  private readonly entries = new Map<string, RateLimitEntry>();
  private readonly options: RateLimitOptions;

  constructor(options: RateLimitOptions) {
    this.options = options;
  }

  isBlocked(key: string, now = Date.now()): RateLimitResult {
    const entry = this.entries.get(key);
    if (!entry || entry.resetAt <= now) {
      return { allowed: true, retryAfterSeconds: 0 };
    }
    return {
      allowed: entry.count < this.options.max,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  consume(key: string, now = Date.now()): RateLimitResult {
    this.cleanup(now);
    const existing = this.entries.get(key);
    const entry =
      existing && existing.resetAt > now
        ? existing
        : { count: 0, resetAt: now + this.options.windowMs };

    entry.count += 1;
    this.entries.set(key, entry);

    return {
      allowed: entry.count <= this.options.max,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  reset(key: string): void {
    this.entries.delete(key);
  }

  private cleanup(now: number): void {
    if (this.entries.size < 1000) return;
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) {
        this.entries.delete(key);
      }
    }
  }
}

export function rateLimitKeyFromHeaders(headers: {
  get(name: string): string | undefined;
}): string {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    forwardedFor ??
    "unknown"
  );
}
