import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const nodeEnv = process.env.NODE_ENV ?? "development";
const databasePath = process.env.DATABASE_PATH ?? "data/stream-canvas.db";
const uploadsDir = process.env.UPLOADS_DIR ?? "data/uploads";
const defaultCorsOrigins = [
  "http://localhost:3000",
  "http://frontend.localhost:1355",
  "https://frontend.localhost:1355",
];
const configuredCorsOrigins = process.env.CORS_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
if (nodeEnv === "production" && !configuredCorsOrigins?.length) {
  throw new Error("CORS_ORIGINS must be set in production.");
}
const corsOrigins = configuredCorsOrigins?.length
  ? configuredCorsOrigins
  : defaultCorsOrigins;

// Ensure data directories exist
for (const dir of [dirname(databasePath), uploadsDir]) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export const config = {
  nodeEnv,
  port: numberEnv("PORT", 8003, { min: 1, max: 65535 }),
  databasePath,
  uploadsDir,
  /** Clerk JWKS public key for networkless JWT verification. */
  clerkJwtKey: process.env.CLERK_JWT_KEY ?? "",
  /** Clerk secret key — needed to fetch JWKS when jwtKey is not set. */
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? "",
  /** Clerk publishable key, kept for environment parity with the frontend. */
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? "",
  /** Clerk issuer URL/domain expected in verified JWTs. */
  clerkIssuerDomain: process.env.CLERK_JWT_ISSUER_DOMAIN ?? "",
  /** Allowed origins for CORS and WebSocket upgrade validation. */
  corsOrigins,
  /** Honor proxy IP headers only when the deployment explicitly opts in. */
  trustProxyHeaders: process.env.TRUST_PROXY_HEADERS === "true",
  /** TTL for short-lived OBS tokens in seconds. */
  obsTokenTtlSeconds: numberEnv("OBS_TOKEN_TTL", 300, {
    min: 1,
    max: 24 * 60 * 60,
  }),
  /** TTL for short-lived editor WebSocket tickets in seconds. */
  canvasWsTokenTtlSeconds: numberEnv("CANVAS_WS_TOKEN_TTL", 60, {
    min: 1,
    max: 60 * 60,
  }),
  /** TTL for uploaded media access URLs in seconds. */
  uploadTokenTtlSeconds: numberEnv("UPLOAD_TOKEN_TTL", 60 * 60, {
    min: 60,
    max: 24 * 60 * 60,
  }),
  /** Maximum accepted upload body size, including multipart overhead. */
  maxUploadBodyBytes: numberEnv("MAX_UPLOAD_BODY_BYTES", 11 * 1024 * 1024, {
    min: 1024,
    max: 100 * 1024 * 1024,
  }),
  /** Maximum accepted file payload size. */
  maxUploadFileBytes: numberEnv("MAX_UPLOAD_FILE_BYTES", 10 * 1024 * 1024, {
    min: 1024,
    max: 100 * 1024 * 1024,
  }),
  /** Maximum upload requests that may be buffered and parsed concurrently. */
  maxConcurrentUploads: numberEnv("MAX_CONCURRENT_UPLOADS", 4, {
    min: 1,
    max: 100,
  }),
  /** Maximum active tldraw socket sessions per room. */
  maxWsSessionsPerRoom: numberEnv("MAX_WS_SESSIONS_PER_ROOM", 32, {
    min: 1,
    max: 500,
  }),
  /** Maximum rooms held in memory at once. */
  maxActiveRooms: numberEnv("MAX_ACTIVE_ROOMS", 200, {
    min: 1,
    max: 10_000,
  }),
} as const;

function numberEnv(
  name: string,
  fallback: number,
  options: { min: number; max: number },
): number {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number(raw);
  if (
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < options.min ||
    value > options.max
  ) {
    throw new Error(
      `${name} must be an integer between ${options.min} and ${options.max}.`,
    );
  }
  return value;
}
