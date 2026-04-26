import { createReadStream, existsSync } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { eq } from "drizzle-orm";
import { type Context, Hono } from "hono";
import { v4 as uuidv4 } from "uuid";
import {
  extractBearer,
  isOriginAllowed,
  mintCanvasWsToken,
  mintObsToken,
  verifyClerkJwt,
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
const wsTokenLimiter = new FixedWindowRateLimit({
  windowMs: 60_000,
  max: 60,
});
const uploadLimiter = new FixedWindowRateLimit({
  windowMs: 10 * 60_000,
  max: 30,
});

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

  try {
    const claims = await verifyClerkJwt(bearer, { origin });
    c.set("clerkUser", claims);
    authFailureLimiter.reset(authKey);
    await next();
  } catch (err) {
    authFailureLimiter.consume(authKey);
    console.error("[auth] JWT verification failed:", err);
    return c.json({ error: "Invalid token" }, 401);
  }
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

  const fileStats = await stat(upload.path);
  const fileSize = fileStats.size;
  const range = parseSingleByteRange(c.req.header("range"), fileSize);
  const contentType = upload.mimeType || "application/octet-stream";

  c.header("Accept-Ranges", "bytes");
  c.header("Content-Type", contentType);
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Cache-Control", "public, max-age=31536000, immutable");

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
  if (isBodyTooLarge(c, 2048)) {
    return c.json({ error: "Request body too large" }, 413);
  }

  const limit = obsTokenLimiter.consume(`obs:${clientKey(c)}`);
  if (!limit.allowed) {
    c.header("Retry-After", String(limit.retryAfterSeconds));
    return c.json({ error: "Too many token exchange attempts" }, 429);
  }

  const body = await c.req.json<{ secret?: unknown }>().catch(() => null);
  if (!body || typeof body.secret !== "string") {
    return c.json({ error: "Missing secret" }, 400);
  }
  if (body.secret.length === 0 || body.secret.length > 256) {
    return c.json({ error: "Invalid secret" }, 400);
  }

  const room = await findRoomByObsSecret(body.secret);
  if (!room) return c.json({ error: "Invalid secret" }, 401);

  const token = mintObsToken(room.id);
  return c.json({
    token,
    roomId: room.id,
    twitchChannel: room.twitchChannel,
    expiresIn: config.obsTokenTtlSeconds,
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

  const allRooms = await db.select().from(rooms);
  const accessible = allRooms.filter((r) => {
    if (r.ownerClerkId === user.sub) return true;
    return r.allowedUsers?.includes(user.sub) ?? false;
  });

  return c.json(accessible.map((r) => sanitizeAccessibleRoom(r, user.sub)));
});

// Update room config
authed.patch("/rooms/:id", async (c) => {
  const room = await findOwnedRoom(c);
  if (!room) return c.json({ error: "Not found" }, 404);

  if (isBodyTooLarge(c, MAX_ROOM_CONFIG_BODY_BYTES)) {
    return c.json({ error: "Request body too large" }, 413);
  }

  const body = await c.req.json().catch(() => null);
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
  if (isBodyTooLarge(c, config.maxUploadBodyBytes)) {
    return c.json({ error: "File too large (max 10 MB)" }, 413);
  }

  const roomId = c.req.param("id");
  if (!isValidRoomId(roomId)) {
    return c.json({ error: "Not found" }, 404);
  }

  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, roomId),
  });
  if (!room) return c.json({ error: "Not found" }, 404);

  const isOwner = room.ownerClerkId === user.sub;
  const isAllowed = room.allowedUsers?.includes(user.sub) ?? false;
  if (!isOwner && !isAllowed) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const limit = uploadLimiter.consume(`upload:${user.sub}:${room.id}`);
  if (!limit.allowed) {
    c.header("Retry-After", String(limit.retryAfterSeconds));
    return c.json({ error: "Too many uploads" }, 429);
  }

  const formData = await c.req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return c.json({ error: "No file provided" }, 400);
  }

  if (file.size > config.maxUploadFileBytes) {
    return c.json({ error: "File too large (max 10 MB)" }, 413);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > config.maxUploadFileBytes) {
    return c.json({ error: "File too large (max 10 MB)" }, 413);
  }

  const sniffedMimeType = sniffUploadMime(buffer);
  if (!sniffedMimeType) {
    return c.json({ error: "File type not allowed" }, 415);
  }

  const mediaValidation = validateUploadedMedia(buffer, sniffedMimeType);
  if (!mediaValidation.ok) {
    return c.json({ error: mediaValidation.error }, 415);
  }

  const uploadId = uuidv4();
  const roomDir = join(config.uploadsDir, room.id);
  await mkdir(roomDir, { recursive: true });
  const safeName = sanitizeUploadFilename(file.name);
  const filePath = join(roomDir, `${uploadId}-${safeName}`);

  await writeFile(filePath, buffer);

  await db.insert(uploads).values({
    id: uploadId,
    roomId: room.id,
    filename: safeName,
    mimeType: sniffedMimeType,
    size: buffer.byteLength,
    path: filePath,
    createdAt: new Date(),
  });

  const url = `/uploads/${uploadId}/${encodeURIComponent(safeName)}`;
  return c.json({ id: uploadId, url, filename: safeName }, 201);
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

function isBodyTooLarge(c: Context, maxBytes: number): boolean {
  const contentLength = c.req.header("content-length");
  if (!contentLength) return false;
  const parsed = Number(contentLength);
  return Number.isFinite(parsed) && parsed > maxBytes;
}

function clientKey(c: Context): string {
  return rateLimitKeyFromHeaders({ get: (name) => c.req.header(name) });
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
