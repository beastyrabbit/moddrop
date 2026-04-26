import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { getConnInfo } from "@hono/node-server/conninfo";
import { eq, or, sql } from "drizzle-orm";
import { type Context, Hono } from "hono";
import { v4 as uuidv4 } from "uuid";
import {
  extractBearer,
  isOriginAllowed,
  mintCanvasWsToken,
  mintObsToken,
  mintUploadAccessToken,
  verifyClerkJwt,
  verifyUploadAccessToken,
} from "./auth.ts";
import { config } from "./config.ts";
import { db } from "./db.ts";
import { parseSingleByteRange } from "./http-range.ts";
import {
  generateObsSecret,
  hashObsSecret,
  isHashedObsSecret,
  verifyObsSecret,
} from "./obs-secret.ts";
import { FixedWindowRateLimit, rateLimitKeyFromHeaders } from "./rate-limit.ts";
import {
  isValidRoomId,
  MAX_ROOM_CONFIG_BODY_BYTES,
  validateRoomConfigUpdate,
} from "./room-validation.ts";
import { rooms, uploads } from "./schema.ts";
import type { ClerkClaims } from "./types.ts";
import {
  sanitizeUploadFilename,
  sniffUploadMime,
  validateUploadedMedia,
} from "./upload-validation.ts";

// ---------------------------------------------------------------------------
// Middleware: require Clerk JWT
// ---------------------------------------------------------------------------

type AuthEnv = { Variables: { clerkUser: ClerkClaims } };

const authFailureLimiter = new FixedWindowRateLimit({
  windowMs: 5 * 60_000,
  max: 20,
});
const obsTokenLimiter = new FixedWindowRateLimit({
  windowMs: 60_000,
  max: 20,
});
const uploadAccessLimiter = new FixedWindowRateLimit({
  windowMs: 60_000,
  max: 240,
});
const wsTokenLimiter = new FixedWindowRateLimit({
  windowMs: 60_000,
  max: 60,
});
const uploadLimiter = new FixedWindowRateLimit({
  windowMs: 10 * 60_000,
  max: 30,
});
let activeUploadParsers = 0;

const authed = new Hono<AuthEnv>();
authed.use("*", async (c, next) => {
  const authKey = `auth:${clientKey(c)}`;
  const failureLimit = authFailureLimiter.isBlocked(authKey);
  if (!failureLimit.allowed) {
    c.header("Retry-After", String(failureLimit.retryAfterSeconds));
    return c.json({ error: "Too many failed authentication attempts" }, 429);
  }

  const origin = c.req.header("Origin");
  if (origin && !isOriginAllowed(origin)) {
    return c.json({ error: "Invalid origin" }, 403);
  }

  const bearer = extractBearer(c.req.header("Authorization"));
  if (!bearer) return c.json({ error: "Missing authorization" }, 401);

  let claims: ClerkClaims;
  try {
    claims = await verifyClerkJwt(bearer, { origin });
  } catch (err) {
    authFailureLimiter.consume(authKey);
    console.warn("[auth] JWT verification failed:", summarizeError(err));
    return c.json({ error: "Invalid token" }, 401);
  }

  c.set("clerkUser", claims);
  return next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export const api = new Hono();

// Health check
api.get("/health", (c) => c.json({ status: "ok" }));

// Serve uploaded files (public)
api.get("/uploads/:uploadId/:filename", async (c) => {
  const upload = await db.query.uploads.findFirst({
    where: eq(uploads.id, c.req.param("uploadId")),
  });
  if (!upload || !existsSync(upload.path)) {
    return c.json({ error: "Not found" }, 404);
  }

  const token = c.req.query("token");
  const tokenClaims = token ? verifyUploadAccessToken(token) : null;
  if (
    !tokenClaims ||
    tokenClaims.uploadId !== upload.id ||
    tokenClaims.roomId !== upload.roomId
  ) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const fileStats = await stat(upload.path);
  const fileSize = fileStats.size;
  const range = parseSingleByteRange(c.req.header("range"), fileSize);
  const contentType = upload.mimeType || "application/octet-stream";

  c.header("Accept-Ranges", "bytes");
  c.header("Content-Type", contentType);
  c.header("X-Content-Type-Options", "nosniff");
  c.header(
    "Cache-Control",
    `private, max-age=${uploadCacheMaxAgeSeconds()}, must-revalidate`,
  );

  if (range.kind === "invalid") {
    c.header("Content-Range", `bytes */${fileSize}`);
    return c.body(null, 416);
  }

  if (range.kind === "range") {
    c.header("Content-Range", `bytes ${range.start}-${range.end}/${fileSize}`);
    c.header("Content-Length", String(range.length));
    const stream = createReadStream(upload.path, {
      start: range.start,
      end: range.end,
    });
    return c.body(Readable.toWeb(stream) as ReadableStream, 206);
  }

  c.header("Content-Length", String(fileSize));
  const stream = createReadStream(upload.path);
  return c.body(Readable.toWeb(stream) as ReadableStream);
});

// ---------------------------------------------------------------------------
// OBS token exchange (unauthenticated — exchanges room secret for short-lived WS token)
// ---------------------------------------------------------------------------

/**
 * The OBS browser source page has no Clerk session. It exchanges the
 * long-lived obsSecret (from the OBS URL) for a short-lived WS token.
 */
api.post("/obs/token", async (c) => {
  const limit = obsTokenLimiter.consume(`obs:${clientKey(c)}`);
  if (!limit.allowed) {
    c.header("Retry-After", String(limit.retryAfterSeconds));
    return c.json({ error: "Too many token exchange attempts" }, 429);
  }

  const bodyResult = await readRequestBody(c, 2048);
  if (!bodyResult.ok) return bodyResult.response;

  const body = parseJsonBody<{ secret?: unknown }>(bodyResult.bytes);
  if (!body || typeof body.secret !== "string") {
    return c.json({ error: "Missing secret" }, 400);
  }
  if (body.secret.length === 0 || body.secret.length > 256) {
    return c.json({ error: "Invalid secret" }, 400);
  }

  const room = await findRoomByObsSecret(body.secret);
  if (!room) {
    logSecurityEvent(c, "obs_token_invalid_secret");
    return c.json({ error: "Invalid secret" }, 401);
  }

  const token = mintObsToken(room.id);
  return c.json({
    token,
    roomId: room.id,
    twitchChannel: room.twitchChannel,
    expiresIn: config.obsTokenTtlSeconds,
  });
});

api.post("/obs/uploads/:uploadId/access-url", async (c) => {
  const limit = uploadAccessLimiter.consume(`obs-upload:${clientKey(c)}`);
  if (!limit.allowed) {
    c.header("Retry-After", String(limit.retryAfterSeconds));
    return c.json({ error: "Too many upload token attempts" }, 429);
  }

  const uploadId = c.req.param("uploadId");
  if (!isValidRoomId(uploadId)) return c.json({ error: "Not found" }, 404);

  const bodyResult = await readRequestBody(c, 2048);
  if (!bodyResult.ok) return bodyResult.response;

  const body = parseJsonBody<{ secret?: unknown }>(bodyResult.bytes);
  if (!body || typeof body.secret !== "string") {
    return c.json({ error: "Missing secret" }, 400);
  }
  if (body.secret.length === 0 || body.secret.length > 256) {
    return c.json({ error: "Invalid secret" }, 400);
  }

  const room = await findRoomByObsSecret(body.secret);
  if (!room) {
    logSecurityEvent(c, "obs_upload_invalid_secret", { uploadId });
    return c.json({ error: "Invalid secret" }, 401);
  }

  const upload = await db.query.uploads.findFirst({
    where: eq(uploads.id, uploadId),
  });
  if (!upload || upload.roomId !== room.id) {
    logSecurityEvent(c, "obs_upload_room_mismatch", { uploadId });
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({
    url: buildUploadAccessUrl(upload),
    expiresIn: config.uploadTokenTtlSeconds,
  });
});

// --- Authenticated routes ---------------------------------------------------

// Create a room
authed.post("/rooms", async (c) => {
  const user = c.get("clerkUser");

  // Check if user already has a room
  const existing = await db.query.rooms.findFirst({
    where: eq(rooms.ownerClerkId, user.sub),
  });
  if (existing) {
    return c.json(sanitizeOwnerRoom(existing));
  }

  const id = uuidv4();
  const now = new Date();
  const obsSecret = generateObsSecret();

  await db.insert(rooms).values({
    id,
    ownerClerkId: user.sub,
    obsSecret: hashObsSecret(obsSecret),
    allowedUsers: [],
    createdAt: now,
    updatedAt: now,
  });

  const room = await db.query.rooms.findFirst({ where: eq(rooms.id, id) });
  if (!room)
    return c.json({ error: "Room created but could not be retrieved" }, 500);
  return c.json(sanitizeOwnerRoom(room, obsSecret), 201);
});

// Get current user's room
authed.get("/rooms/me", async (c) => {
  const user = c.get("clerkUser");
  const room = await db.query.rooms.findFirst({
    where: eq(rooms.ownerClerkId, user.sub),
  });
  if (!room) return c.json({ error: "No room found" }, 404);
  return c.json(sanitizeOwnerRoom(room));
});

// List all rooms the user can access (own room + rooms they're allowed on)
authed.get("/rooms/accessible", async (c) => {
  const user = c.get("clerkUser");

  const accessible = await db
    .select()
    .from(rooms)
    .where(
      or(
        eq(rooms.ownerClerkId, user.sub),
        sql`EXISTS (
          SELECT 1
          FROM json_each(${rooms.allowedUsers})
          WHERE json_each.value = ${user.sub}
        )`,
      ),
    );

  return c.json(accessible.map((r) => sanitizeAccessibleRoom(r, user.sub)));
});

// Update room config
authed.patch("/rooms/:id", async (c) => {
  const room = await findOwnedRoom(c);
  if (!room) return c.json({ error: "Not found" }, 404);

  const bodyResult = await readRequestBody(c, MAX_ROOM_CONFIG_BODY_BYTES);
  if (!bodyResult.ok) return bodyResult.response;

  const body = parseJsonBody(bodyResult.bytes);
  const validation = validateRoomConfigUpdate(body, room.ownerClerkId);
  if (!validation.ok) {
    return c.json({ error: validation.error }, 400);
  }

  await db
    .update(rooms)
    .set({
      ...(validation.value.twitchChannel !== undefined && {
        twitchChannel: validation.value.twitchChannel,
      }),
      ...(validation.value.allowedUsers !== undefined && {
        allowedUsers: validation.value.allowedUsers,
      }),
      updatedAt: new Date(),
    })
    .where(eq(rooms.id, room.id));

  const updated = await db.query.rooms.findFirst({
    where: eq(rooms.id, room.id),
  });
  if (!updated) {
    return c.json({ error: "Updated room could not be retrieved" }, 500);
  }

  return c.json(sanitizeOwnerRoom(updated));
});

// Mint a short-lived editor WebSocket ticket. Raw Clerk JWTs never go in WS URLs.
authed.post("/rooms/:id/ws-token", async (c) => {
  const user = c.get("clerkUser");
  const room = await findAccessibleRoom(c);
  if (!room) return c.json({ error: "Not found" }, 404);

  const limit = wsTokenLimiter.consume(`ws-token:${user.sub}:${room.id}`);
  if (!limit.allowed) {
    c.header("Retry-After", String(limit.retryAfterSeconds));
    return c.json({ error: "Too many WebSocket token requests" }, 429);
  }

  return c.json({
    token: mintCanvasWsToken(room.id, user.sub),
    roomId: room.id,
    expiresIn: config.canvasWsTokenTtlSeconds,
  });
});

authed.get("/rooms/:id/uploads/:uploadId/access-url", async (c) => {
  const room = await findAccessibleRoom(c);
  if (!room) return c.json({ error: "Not found" }, 404);

  const uploadId = c.req.param("uploadId");
  if (!isValidRoomId(uploadId)) return c.json({ error: "Not found" }, 404);

  const upload = await db.query.uploads.findFirst({
    where: eq(uploads.id, uploadId),
  });
  if (!upload || upload.roomId !== room.id) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({
    url: buildUploadAccessUrl(upload),
    expiresIn: config.uploadTokenTtlSeconds,
  });
});

// Regenerate OBS secret
authed.post("/rooms/:id/regenerate-secret", async (c) => {
  const room = await findOwnedRoom(c);
  if (!room) return c.json({ error: "Not found" }, 404);

  const newSecret = generateObsSecret();
  await db
    .update(rooms)
    .set({ obsSecret: hashObsSecret(newSecret), updatedAt: new Date() })
    .where(eq(rooms.id, room.id));

  return c.json({ ok: true, obsSecret: newSecret });
});

// OBS secrets are hashed at rest and cannot be revealed after creation.
authed.get("/rooms/:id/obs-secret", async (c) => {
  const room = await findOwnedRoom(c);
  if (!room) return c.json({ error: "Not found" }, 404);

  return c.json(
    { error: "OBS secrets cannot be revealed. Regenerate to copy a new URL." },
    410,
  );
});

// Upload a file
authed.post("/rooms/:id/upload", async (c) => {
  const user = c.get("clerkUser");
  const room = await findAccessibleRoom(c);
  if (!room) return c.json({ error: "Not found" }, 404);

  const limit = uploadLimiter.consume(`upload:${user.sub}:${room.id}`);
  if (!limit.allowed) {
    c.header("Retry-After", String(limit.retryAfterSeconds));
    return c.json({ error: "Too many uploads" }, 429);
  }

  return withUploadSlot(c, async () => {
    const bodyResult = await readRequestBody(
      c,
      config.maxUploadBodyBytes,
      "File too large (max 10 MB)",
    );
    if (!bodyResult.ok) return bodyResult.response;

    const file = parseMultipartUpload(c, bodyResult.bytes);
    if (!file) {
      return c.json({ error: "Invalid multipart body" }, 400);
    }

    if (file.bytes.byteLength > config.maxUploadFileBytes) {
      return c.json({ error: "File too large (max 10 MB)" }, 413);
    }

    const sniffedMimeType = sniffUploadMime(file.bytes);
    if (!sniffedMimeType) {
      return c.json({ error: "File type not allowed" }, 415);
    }

    const mediaValidation = validateUploadedMedia(file.bytes, sniffedMimeType);
    if (!mediaValidation.ok) {
      return c.json({ error: mediaValidation.error }, 415);
    }

    const uploadId = uuidv4();
    const roomDir = join(config.uploadsDir, room.id);
    await mkdir(roomDir, { recursive: true });
    const safeName = sanitizeUploadFilename(file.name);
    const filePath = join(roomDir, `${uploadId}-${safeName}`);

    await writeFile(filePath, file.bytes);

    try {
      await db.insert(uploads).values({
        id: uploadId,
        roomId: room.id,
        filename: safeName,
        mimeType: sniffedMimeType,
        size: file.bytes.byteLength,
        path: filePath,
        createdAt: new Date(),
      });
    } catch (err) {
      await rm(filePath, { force: true }).catch((cleanupErr) => {
        console.error("[upload] failed to clean up orphaned file:", cleanupErr);
      });
      throw err;
    }

    const url = `/uploads/${uploadId}/${encodeURIComponent(safeName)}`;
    return c.json({ id: uploadId, url, filename: safeName }, 201);
  });
});

api.route("/api", authed);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Find a room by :id param and verify the authenticated user owns it. */
async function findOwnedRoom(c: Context<AuthEnv>) {
  const user = c.get("clerkUser");
  const roomId = c.req.param("id");
  if (!roomId || !isValidRoomId(roomId)) return null;

  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, roomId),
  });
  if (!room || room.ownerClerkId !== user.sub) return null;
  return room;
}

async function findAccessibleRoom(c: Context<AuthEnv>) {
  const user = c.get("clerkUser");
  const roomId = c.req.param("id");
  if (!roomId || !isValidRoomId(roomId)) return null;

  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, roomId),
  });
  if (!room) return null;

  const isOwner = room.ownerClerkId === user.sub;
  const isAllowed = room.allowedUsers?.includes(user.sub) ?? false;
  if (!isOwner && !isAllowed) return null;
  return room;
}

async function findRoomByObsSecret(secret: string) {
  const hashedSecret = hashObsSecret(secret);
  const hashedRoom = await db.query.rooms.findFirst({
    where: eq(rooms.obsSecret, hashedSecret),
  });
  if (hashedRoom) return hashedRoom;

  const legacyRoom = await db.query.rooms.findFirst({
    where: eq(rooms.obsSecret, secret),
  });
  if (!legacyRoom || !verifyObsSecret(secret, legacyRoom.obsSecret)) {
    return null;
  }

  if (!isHashedObsSecret(legacyRoom.obsSecret)) {
    await db
      .update(rooms)
      .set({ obsSecret: hashedSecret, updatedAt: new Date() })
      .where(eq(rooms.id, legacyRoom.id));
  }

  return legacyRoom;
}

/** Owner settings endpoints keep full collaborator config, but never the stored secret. */
function sanitizeOwnerRoom(room: RoomRecord, obsSetupSecret?: string) {
  return {
    id: room.id,
    ownerClerkId: room.ownerClerkId,
    twitchChannel: room.twitchChannel,
    allowedUsers: room.allowedUsers ?? [],
    createdAt: room.createdAt?.toISOString() ?? null,
    updatedAt: room.updatedAt?.toISOString() ?? null,
    ...(obsSetupSecret ? { obsSetupSecret } : {}),
  };
}

/** Shared room listings expose only what collaborators need to connect. */
function sanitizeAccessibleRoom(room: RoomRecord, clerkUserId: string) {
  return {
    id: room.id,
    twitchChannel: room.twitchChannel,
    collaboratorCount: room.allowedUsers?.length ?? 0,
    isOwner: room.ownerClerkId === clerkUserId,
    createdAt: room.createdAt?.toISOString() ?? null,
    updatedAt: room.updatedAt?.toISOString() ?? null,
  };
}

function buildUploadAccessUrl(upload: UploadRecord): string {
  const token = mintUploadAccessToken(upload.roomId, upload.id);
  const filename = encodeURIComponent(upload.filename);
  return `/uploads/${upload.id}/${filename}?token=${encodeURIComponent(token)}`;
}

function uploadCacheMaxAgeSeconds(): number {
  return Math.max(0, config.uploadTokenTtlSeconds - 30);
}

async function withUploadSlot(
  c: Context,
  handler: () => Promise<Response>,
): Promise<Response> {
  if (activeUploadParsers >= config.maxConcurrentUploads) {
    c.header("Retry-After", "10");
    return c.json({ error: "Too many concurrent uploads" }, 503);
  }

  activeUploadParsers += 1;
  try {
    return await handler();
  } finally {
    activeUploadParsers -= 1;
  }
}

function logSecurityEvent(
  c: Context,
  event: string,
  fields: Record<string, string | undefined> = {},
): void {
  const clientHash = createHash("sha256").update(clientKey(c)).digest("base64url");
  console.warn("[security]", {
    event,
    client: clientHash.slice(0, 16),
    ...fields,
  });
}

function summarizeError(error: unknown): Record<string, string | undefined> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return { message: String(error) };
}

type BodyReadResult =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; response: Response };

async function readRequestBody(
  c: Context,
  maxBytes: number,
  tooLargeMessage = "Request body too large",
): Promise<BodyReadResult> {
  const declaredLengthError = validateDeclaredContentLength(
    c,
    maxBytes,
    tooLargeMessage,
  );
  if (declaredLengthError) return { ok: false, response: declaredLengthError };

  const stream = c.req.raw.body;
  if (!stream) return { ok: true, bytes: new Uint8Array() };

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return {
        ok: false,
        response: c.json({ error: tooLargeMessage }, 413),
      };
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { ok: true, bytes };
}

function validateDeclaredContentLength(
  c: Context,
  maxBytes: number,
  tooLargeMessage: string,
): Response | null {
  const contentLength = c.req.header("content-length");
  if (!contentLength) return null;

  const parsed = Number(contentLength);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    return c.json({ error: "Invalid Content-Length" }, 400);
  }
  if (parsed > maxBytes) {
    return c.json({ error: tooLargeMessage }, 413);
  }
  return null;
}

function parseJsonBody<T = unknown>(bytes: Uint8Array): T | null {
  try {
    const text = new TextDecoder().decode(bytes);
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

interface UploadedFilePart {
  name: string;
  bytes: Buffer;
}

function parseMultipartUpload(c: Context, bytes: Uint8Array): UploadedFilePart | null {
  const contentType = c.req.header("content-type");
  const boundary = parseMultipartBoundary(contentType);
  if (!boundary) return null;

  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const delimiter = Buffer.from(`--${boundary}`);
  const firstDelimiter = buffer.indexOf(delimiter);
  if (firstDelimiter === -1) return null;

  let partStart = firstDelimiter + delimiter.length;
  if (buffer.subarray(partStart, partStart + 2).equals(Buffer.from("--"))) {
    return null;
  }
  if (buffer.subarray(partStart, partStart + 2).equals(Buffer.from("\r\n"))) {
    partStart += 2;
  }

  const headerEnd = buffer.indexOf(Buffer.from("\r\n\r\n"), partStart);
  if (headerEnd === -1 || headerEnd - partStart > 8192) return null;

  const headers = parseMultipartHeaders(
    buffer.subarray(partStart, headerEnd).toString("utf8"),
  );
  const disposition = headers.get("content-disposition");
  if (!disposition?.startsWith("form-data")) return null;
  if (parseDispositionValue(disposition, "name") !== "file") return null;

  const filename = parseDispositionValue(disposition, "filename");
  if (!filename) return null;

  const dataStart = headerEnd + 4;
  const nextBoundary = buffer.indexOf(Buffer.from(`\r\n--${boundary}`), dataStart);
  if (nextBoundary === -1) return null;

  return {
    name: filename,
    bytes: buffer.subarray(dataStart, nextBoundary),
  };
}

function parseMultipartBoundary(contentType: string | undefined): string | null {
  const match = contentType?.match(/(?:^|;)\s*boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = (match?.[1] ?? match?.[2])?.trim();
  if (!boundary || boundary.length > 200) return null;
  return boundary;
}

function parseMultipartHeaders(rawHeaders: string): Map<string, string> {
  const headers = new Map<string, string>();
  for (const line of rawHeaders.split("\r\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    headers.set(
      line.slice(0, separator).trim().toLowerCase(),
      line.slice(separator + 1).trim(),
    );
  }
  return headers;
}

function parseDispositionValue(disposition: string, name: string): string | null {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = disposition.match(
    new RegExp(`(?:^|;)\\s*${escapedName}="([^"]*)"`, "i"),
  );
  return match?.[1] ?? null;
}

function clientKey(c: Context): string {
  let remoteAddress: string | undefined;
  try {
    remoteAddress = getConnInfo(c).remote.address;
  } catch {
    remoteAddress = undefined;
  }

  return rateLimitKeyFromHeaders(
    { get: (name) => c.req.header(name) },
    remoteAddress,
    config.trustProxyHeaders,
  );
}

interface RoomRecord {
  id: string;
  ownerClerkId: string;
  twitchChannel: string | null;
  obsSecret: string;
  allowedUsers: string[] | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface UploadRecord {
  id: string;
  roomId: string;
  filename: string;
}
