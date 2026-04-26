import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { config } from "./config.ts";
import type {
  CanvasWsTokenClaims,
  ClerkClaims,
  ObsTokenClaims,
  UploadAccessTokenClaims,
} from "./types.ts";

// ---------------------------------------------------------------------------
// Clerk JWT verification — uses jwtKey for local (networkless) verification
// when set, otherwise falls back to secretKey (requires network).
// ---------------------------------------------------------------------------

/** Lazy-load @clerk/backend once, then reuse. */
let clerkBackend: typeof import("@clerk/backend") | undefined;

export const MAX_CLERK_JWT_LENGTH = 8192;
export const MAX_INTERNAL_TOKEN_LENGTH = 2048;

interface ClerkValidationOptions {
  origin?: string;
  issuer?: string;
  authorizedParties?: readonly string[];
}

/** Verify a Clerk JWT and return the decoded claims. */
export async function verifyClerkJwt(
  token: string,
  options: ClerkValidationOptions = {},
): Promise<ClerkClaims> {
  if (token.length > MAX_CLERK_JWT_LENGTH) {
    throw new Error("Clerk JWT is too large");
  }
  if (!config.clerkJwtKey && !config.clerkSecretKey) {
    throw new Error("Clerk JWT verification is not configured");
  }

  clerkBackend ??= await import("@clerk/backend");

  const payload = await clerkBackend.verifyToken(token, {
    jwtKey: config.clerkJwtKey || undefined,
    secretKey: config.clerkSecretKey || undefined,
    authorizedParties: [...config.corsOrigins],
  });

  const claims = payload as unknown as ClerkClaims;
  validateClerkClaims(claims, {
    issuer: options.issuer ?? normalizedClerkIssuer(),
    authorizedParties: options.authorizedParties ?? config.corsOrigins,
    origin: options.origin,
  });
  return claims;
}

export function validateClerkClaims(
  claims: ClerkClaims,
  options: ClerkValidationOptions,
): void {
  if (!claims.sub || claims.sub.length > 128) {
    throw new Error("Invalid Clerk subject claim");
  }

  if (options.issuer && claims.iss !== options.issuer) {
    throw new Error("Invalid Clerk issuer claim");
  }

  const authorizedParties = options.authorizedParties ?? [];
  if (options.origin && !authorizedParties.includes(options.origin)) {
    throw new Error("Origin is not allowed");
  }

  if (authorizedParties.length > 0) {
    if (!claims.azp || !authorizedParties.includes(claims.azp)) {
      throw new Error("Invalid Clerk authorized party claim");
    }
    if (options.origin && claims.azp !== options.origin) {
      throw new Error("Clerk authorized party does not match request origin");
    }
  }
}

export function normalizedClerkIssuer(): string | undefined {
  const raw = config.clerkIssuerDomain.trim();
  if (!raw) return undefined;
  const withProtocol = raw.startsWith("http") ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
}

// ---------------------------------------------------------------------------
// Short-lived OBS tokens (HMAC-signed)
// ---------------------------------------------------------------------------

const INTERNAL_TOKEN_SIGNING_SECRET = getInternalTokenSigningSecret();

if (!process.env.OBS_TOKEN_SIGNING_SECRET) {
  if (config.nodeEnv === "production") {
    throw new Error("OBS_TOKEN_SIGNING_SECRET must be set in production.");
  }
  console.warn(
    "[stream-canvas] OBS_TOKEN_SIGNING_SECRET not set — using random secret. OBS tokens will not survive restarts.",
  );
}
if (
  process.env.OBS_TOKEN_SIGNING_SECRET &&
  Buffer.byteLength(process.env.OBS_TOKEN_SIGNING_SECRET, "utf8") < 32
) {
  const message = "OBS_TOKEN_SIGNING_SECRET must be at least 32 bytes.";
  if (config.nodeEnv === "production") {
    throw new Error(message);
  }
  console.warn(`[stream-canvas] ${message}`);
}
if (!config.clerkJwtKey && !config.clerkSecretKey) {
  if (config.nodeEnv === "production") {
    throw new Error(
      "CLERK_JWT_KEY or CLERK_SECRET_KEY must be set in production.",
    );
  }
  console.warn(
    "[stream-canvas] Neither CLERK_JWT_KEY nor CLERK_SECRET_KEY is set. All authenticated requests will fail.",
  );
}

function getInternalTokenSigningSecret(): string {
  return process.env.OBS_TOKEN_SIGNING_SECRET ?? randomBytes(32).toString("hex");
}
if (!normalizedClerkIssuer()) {
  if (config.nodeEnv === "production") {
    throw new Error("CLERK_JWT_ISSUER_DOMAIN must be set in production.");
  }
  console.warn(
    "[stream-canvas] CLERK_JWT_ISSUER_DOMAIN not set — issuer validation is disabled.",
  );
}

function hmacSign(payload: string): string {
  return createHmac("sha256", INTERNAL_TOKEN_SIGNING_SECRET)
    .update(payload)
    .digest("base64url");
}

function signClaims(
  claims: ObsTokenClaims | CanvasWsTokenClaims | UploadAccessTokenClaims,
): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = hmacSign(payload);
  return `${payload}.${signature}`;
}

function verifySignedClaims(token: string): unknown | null {
  if (token.length > MAX_INTERNAL_TOKEN_LENGTH) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;

  const expected = hmacSign(payload);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
}

/** Mint a short-lived OBS token for a given room. */
export function mintObsToken(roomId: string): string {
  const claims: ObsTokenClaims = {
    roomId,
    role: "obs",
    scope: "stream-canvas-ws",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + config.obsTokenTtlSeconds,
  };
  return signClaims(claims);
}

/** Verify and decode a short-lived OBS token. Returns null if invalid. */
export function verifyObsToken(
  token: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): ObsTokenClaims | null {
  const claims = verifySignedClaims(token);
  if (!isObsTokenClaims(claims)) return null;
  if (claims.exp < nowSeconds) return null;
  return claims;
}

/** Mint a short-lived editor WebSocket ticket. */
export function mintCanvasWsToken(roomId: string, userId: string): string {
  const claims: CanvasWsTokenClaims = {
    roomId,
    userId,
    role: "editor",
    scope: "stream-canvas-ws",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + config.canvasWsTokenTtlSeconds,
  };
  return signClaims(claims);
}

/** Verify and decode a short-lived editor WebSocket ticket. */
export function verifyCanvasWsToken(
  token: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): CanvasWsTokenClaims | null {
  const claims = verifySignedClaims(token);
  if (!isCanvasWsTokenClaims(claims)) return null;
  if (claims.exp < nowSeconds) return null;
  return claims;
}

/** Mint a short-lived access token for an uploaded media file. */
export function mintUploadAccessToken(roomId: string, uploadId: string): string {
  const claims: UploadAccessTokenClaims = {
    roomId,
    uploadId,
    scope: "stream-canvas-upload",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + config.uploadTokenTtlSeconds,
  };
  return signClaims(claims);
}

/** Verify and decode a short-lived uploaded media access token. */
export function verifyUploadAccessToken(
  token: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): UploadAccessTokenClaims | null {
  const claims = verifySignedClaims(token);
  if (!isUploadAccessTokenClaims(claims)) return null;
  if (claims.exp < nowSeconds) return null;
  return claims;
}

// ---------------------------------------------------------------------------
// HTTP header helpers
// ---------------------------------------------------------------------------

/** Extract a Bearer token from an Authorization header value. */
export function extractBearer(header: string | undefined): string | null {
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  if (token.length > MAX_CLERK_JWT_LENGTH) return null;
  return token;
}

/** Validate the Origin header against allowed origins. */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;
  return config.corsOrigins.includes(origin);
}

function isObsTokenClaims(value: unknown): value is ObsTokenClaims {
  return (
    typeof value === "object" &&
    value !== null &&
    "roomId" in value &&
    "role" in value &&
    "scope" in value &&
    "exp" in value &&
    "iat" in value &&
    typeof value.roomId === "string" &&
    value.role === "obs" &&
    value.scope === "stream-canvas-ws" &&
    typeof value.exp === "number" &&
    typeof value.iat === "number"
  );
}

function isCanvasWsTokenClaims(value: unknown): value is CanvasWsTokenClaims {
  return (
    typeof value === "object" &&
    value !== null &&
    "roomId" in value &&
    "userId" in value &&
    "role" in value &&
    "scope" in value &&
    "exp" in value &&
    "iat" in value &&
    typeof value.roomId === "string" &&
    typeof value.userId === "string" &&
    value.role === "editor" &&
    value.scope === "stream-canvas-ws" &&
    typeof value.exp === "number" &&
    typeof value.iat === "number"
  );
}

function isUploadAccessTokenClaims(
  value: unknown,
): value is UploadAccessTokenClaims {
  return (
    typeof value === "object" &&
    value !== null &&
    "roomId" in value &&
    "uploadId" in value &&
    "scope" in value &&
    "exp" in value &&
    "iat" in value &&
    typeof value.roomId === "string" &&
    typeof value.uploadId === "string" &&
    value.scope === "stream-canvas-upload" &&
    typeof value.exp === "number" &&
    typeof value.iat === "number"
  );
}
