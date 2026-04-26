import { isIP } from "node:net";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  maxEntries?: number;
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
  private readonly options: Required<RateLimitOptions>;

  constructor(options: RateLimitOptions) {
    this.options = { maxEntries: 10_000, ...options };
  }

  isBlocked(key: string, now = Date.now()): RateLimitResult {
    if (this.entries.size > this.options.maxEntries) {
      this.cleanup(now);
    }

    const entry = this.entries.get(key);
    if (!entry || entry.resetAt <= now) {
      if (entry) {
        this.entries.delete(key);
      }
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
    if (this.entries.size > this.options.maxEntries) {
      this.cleanup(now);
    }

    return {
      allowed: entry.count <= this.options.max,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  private cleanup(now: number): void {
    if (this.entries.size < 1000 && this.entries.size <= this.options.maxEntries) {
      return;
    }

    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) {
        this.entries.delete(key);
      }
    }

    while (this.entries.size > this.options.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) break;
      this.entries.delete(oldestKey);
    }
  }
}

export function rateLimitKeyFromHeaders(headers: {
  get(name: string): string | undefined;
}): string;
export function rateLimitKeyFromHeaders(
  headers: { get(name: string): string | undefined },
  remoteAddress: string | undefined,
  trustProxyHeaders: boolean,
): string;
export function rateLimitKeyFromHeaders(
  headers: { get(name: string): string | undefined },
  remoteAddress?: string,
  trustProxyHeaders = false,
): string {
  const remoteKey = normalizeClientAddress(remoteAddress);
  if (!trustProxyHeaders) {
    return remoteKey;
  }

  return (
    normalizeIp(headers.get("cf-connecting-ip")) ??
    normalizeIp(headers.get("x-real-ip")) ??
    normalizeIp(headers.get("x-forwarded-for")?.split(",")[0]) ??
    remoteKey
  );
}

function normalizeClientAddress(address: string | undefined): string {
  return normalizeIp(address) ?? "unknown-remote";
}

function normalizeIp(address: string | undefined): string | undefined {
  const trimmed = address?.trim();
  if (!trimmed) return undefined;
  return isIP(trimmed) ? trimmed : undefined;
}
