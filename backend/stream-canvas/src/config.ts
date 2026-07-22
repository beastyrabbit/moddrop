const nodeEnv = process.env.NODE_ENV ?? "development";
const defaultCorsOrigins = [
  "http://localhost:3000",
  "http://moddrop.localhost:1355",
  "https://moddrop.localhost:1355",
];
const configuredCorsOrigins = process.env.CORS_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const objectStorageMode = process.env.OBJECT_STORAGE_MODE ?? "filesystem";
if (objectStorageMode !== "filesystem" && objectStorageMode !== "s3") {
  throw new Error("OBJECT_STORAGE_MODE must be either filesystem or s3.");
}
const uploadsDir = process.env.UPLOADS_DIR ?? "data/uploads";

export const config = {
  nodeEnv,
  port: numberEnv("PORT", 8003, { min: 1, max: 65535 }),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://moddrop:moddrop@127.0.0.1:5432/moddrop",
  databasePoolSize: numberEnv("DATABASE_POOL_SIZE", 10, { min: 1, max: 100 }),
  objectStorageMode,
  uploadsDir,
  s3Endpoint: process.env.S3_ENDPOINT ?? "",
  s3Region: process.env.S3_REGION ?? "garage",
  s3AccessKey: process.env.S3_ACCESS_KEY ?? "",
  s3SecretKey: process.env.S3_SECRET_KEY ?? "",
  s3Bucket: process.env.S3_BUCKET ?? "moddrop-assets",
  clerkJwtKey: process.env.CLERK_JWT_KEY ?? "",
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? "",
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? "",
  clerkIssuerDomain: process.env.CLERK_JWT_ISSUER_DOMAIN ?? "",
  corsOrigins: configuredCorsOrigins?.length
    ? configuredCorsOrigins
    : defaultCorsOrigins,
  trustProxyHeaders: process.env.TRUST_PROXY_HEADERS === "true",
  obsTokenTtlSeconds: numberEnv("OBS_TOKEN_TTL", 300, {
    min: 1,
    max: 24 * 60 * 60,
  }),
  canvasWsTokenTtlSeconds: numberEnv("CANVAS_WS_TOKEN_TTL", 60, {
    min: 1,
    max: 60 * 60,
  }),
  uploadTokenTtlSeconds: numberEnv("UPLOAD_TOKEN_TTL", 60 * 60, {
    min: 60,
    max: 24 * 60 * 60,
  }),
  maxUploadBodyBytes: numberEnv("MAX_UPLOAD_BODY_BYTES", 52 * 1024 * 1024, {
    min: 1024,
    max: 512 * 1024 * 1024,
  }),
  maxUploadFileBytes: numberEnv("MAX_UPLOAD_FILE_BYTES", 50 * 1024 * 1024, {
    min: 1024,
    max: 500 * 1024 * 1024,
  }),
  maxConcurrentUploads: numberEnv("MAX_CONCURRENT_UPLOADS", 4, {
    min: 1,
    max: 100,
  }),
  maxWsSessionsPerRoom: numberEnv("MAX_WS_SESSIONS_PER_ROOM", 32, {
    min: 1,
    max: 500,
  }),
  maxActiveRooms: numberEnv("MAX_ACTIVE_ROOMS", 200, {
    min: 1,
    max: 10_000,
  }),
} as const;

export function validateObjectStorageConfig(): void {
  if (nodeEnv === "production" && objectStorageMode !== "s3") {
    throw new Error("OBJECT_STORAGE_MODE=s3 is required in production.");
  }
  if (objectStorageMode !== "s3") return;
  for (const [name, value] of [
    ["S3_ENDPOINT", config.s3Endpoint],
    ["S3_ACCESS_KEY", config.s3AccessKey],
    ["S3_SECRET_KEY", config.s3SecretKey],
    ["S3_BUCKET", config.s3Bucket],
  ] as const) {
    if (!value) throw new Error(`${name} must be set for S3 object storage.`);
  }
}

export function validateServerConfig(): void {
  if (nodeEnv === "production" && !configuredCorsOrigins?.length) {
    throw new Error("CORS_ORIGINS must be set in production.");
  }
}

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
