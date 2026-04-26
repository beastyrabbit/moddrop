import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const databasePath = process.env.DATABASE_PATH ?? "data/stream-canvas.db";
const uploadsDir = process.env.UPLOADS_DIR ?? "data/uploads";
const defaultCorsOrigins = [
  "http://localhost:3000",
  "http://frontend.localhost:1355",
  "https://frontend.localhost:1355",
];
const corsOrigins =
  process.env.CORS_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? defaultCorsOrigins;

// Ensure data directories exist
for (const dir of [dirname(databasePath), uploadsDir]) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 8003),
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
  /** TTL for short-lived OBS tokens in seconds. */
  obsTokenTtlSeconds: Number(process.env.OBS_TOKEN_TTL ?? 300),
  /** TTL for short-lived editor WebSocket tickets in seconds. */
  canvasWsTokenTtlSeconds: Number(process.env.CANVAS_WS_TOKEN_TTL ?? 60),
  /** Maximum accepted upload body size, including multipart overhead. */
  maxUploadBodyBytes: Number(
    process.env.MAX_UPLOAD_BODY_BYTES ?? 11 * 1024 * 1024,
  ),
  /** Maximum accepted file payload size. */
  maxUploadFileBytes: Number(
    process.env.MAX_UPLOAD_FILE_BYTES ?? 10 * 1024 * 1024,
  ),
  /** Maximum active tldraw socket sessions per room. */
  maxWsSessionsPerRoom: Number(process.env.MAX_WS_SESSIONS_PER_ROOM ?? 32),
  /** Maximum rooms held in memory at once. */
  maxActiveRooms: Number(process.env.MAX_ACTIVE_ROOMS ?? 200),
} as const;
