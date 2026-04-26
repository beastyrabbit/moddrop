import type { IncomingMessage } from "node:http";
import {
  NodeSqliteWrapper,
  SQLiteSyncStorage,
  TLSocketRoom,
} from "@tldraw/sync-core";
import { eq } from "drizzle-orm";
import type { WebSocket } from "ws";
import {
  isOriginAllowed,
  verifyCanvasWsToken,
  verifyObsToken,
} from "./auth.ts";
import { config } from "./config.ts";
import { db, sqlite } from "./db.ts";
import { FixedWindowRateLimit, rateLimitKeyFromHeaders } from "./rate-limit.ts";
import { isValidRoomId } from "./room-validation.ts";
import { rooms } from "./schema.ts";
import { streamCanvasSchema } from "./tldraw-schema.ts";
import type { ConnectionRole } from "./types.ts";

// ---------------------------------------------------------------------------
// tldraw storage — each room gets its own SQLiteSyncStorage with a unique
// tablePrefix so documents are isolated per room in the same SQLite DB.
// ---------------------------------------------------------------------------

function createRoomStorage(roomId: string) {
  // Sanitize roomId for use as a SQL table prefix (UUIDs contain hyphens)
  const safePrefix = `tl_${roomId.replace(/-/g, "_")}_`;
  return new SQLiteSyncStorage({
    sql: new NodeSqliteWrapper(sqlite, { tablePrefix: safePrefix }),
  });
}

// ---------------------------------------------------------------------------
// Room management
// ---------------------------------------------------------------------------

const activeRooms = new Map<string, TLSocketRoom>();
const wsFailureLimiter = new FixedWindowRateLimit({
  windowMs: 5 * 60_000,
  max: 30,
});

function getOrCreateRoom(roomId: string): TLSocketRoom {
  let room = activeRooms.get(roomId);
  if (room) return room;

  room = new TLSocketRoom({
    storage: createRoomStorage(roomId),
    schema: streamCanvasSchema,
    onSessionRemoved(_room, { numSessionsRemaining }) {
      // Wait 30s before cleanup to allow brief reconnects (e.g., page refresh)
      if (numSessionsRemaining === 0) {
        setTimeout(() => {
          const r = activeRooms.get(roomId);
          if (r && r.getNumActiveSessions() === 0) {
            r.close();
            activeRooms.delete(roomId);
          }
        }, 30_000);
      }
    },
  });

  activeRooms.set(roomId, room);
  return room;
}

/** Close all active rooms (for graceful shutdown). */
export function closeAllRooms() {
  for (const [, room] of activeRooms) {
    room.close();
  }
  activeRooms.clear();
}

// ---------------------------------------------------------------------------
// WebSocket upgrade authentication
// ---------------------------------------------------------------------------

interface AuthResult {
  role: ConnectionRole;
  roomId: string;
  userId?: string;
}

/**
 * Authenticate a WebSocket upgrade request.
 *
 * Browser WebSocket() API does not support custom headers, so tokens
 * are passed as URL query parameters:
 *   ws://host/ws?roomId=XXX&token=SHORT_LIVED_CANVAS_OR_OBS_TOKEN
 */
export async function authenticateWebSocketUpgrade(
  req: IncomingMessage,
): Promise<AuthResult | null> {
  // Validate Origin header
  const origin = req.headers.origin;
  if (!isOriginAllowed(origin)) {
    console.warn("[ws] rejected: invalid origin", origin);
    return null;
  }

  const url = new URL(req.url ?? "", "http://stream-canvas.local");
  const roomId = url.searchParams.get("roomId");
  const token = url.searchParams.get("token");
  if (!roomId || !token) return null;

  if (!isValidRoomId(roomId)) return null;

  // Browser editors use short-lived canvas tickets minted by the HTTP API.
  const editorClaims = verifyCanvasWsToken(token);
  if (editorClaims && editorClaims.roomId === roomId) {
    const room = await db.query.rooms.findFirst({
      where: eq(rooms.id, roomId),
    });
    if (!room) return null;

    const isOwner = room.ownerClerkId === editorClaims.userId;
    const isAllowed = room.allowedUsers?.includes(editorClaims.userId) ?? false;
    if (!isOwner && !isAllowed) return null;

    return { role: "editor", roomId, userId: editorClaims.userId };
  }

  // Try as short-lived OBS token
  const obsClaims = verifyObsToken(token);
  if (obsClaims && obsClaims.roomId === roomId) {
    const room = await db.query.rooms.findFirst({
      where: eq(rooms.id, roomId),
    });
    if (!room) return null;
    return { role: "obs", roomId };
  }

  return null;
}

// ---------------------------------------------------------------------------
// WebSocket connection handler
// ---------------------------------------------------------------------------

/**
 * Handle a new WebSocket connection after HTTP upgrade.
 *
 * The `ws` library's WebSocket satisfies tldraw's `WebSocketMinimal` interface
 * (addEventListener, removeEventListener, send, close, readyState).
 * TLSocketRoom attaches its own event listeners internally via handleSocketConnect.
 */
export async function handleWebSocketUpgrade(
  ws: WebSocket,
  req: IncomingMessage,
) {
  const failureKey = `ws:${clientKey(req)}`;
  const failureLimit = wsFailureLimiter.isBlocked(failureKey);
  if (!failureLimit.allowed) {
    ws.close(4008, "Too many authentication failures");
    return;
  }

  const auth = await authenticateWebSocketUpgrade(req);
  if (!auth) {
    wsFailureLimiter.consume(failureKey);
    ws.close(4001, "Unauthorized");
    return;
  }

  if (
    !activeRooms.has(auth.roomId) &&
    activeRooms.size >= config.maxActiveRooms
  ) {
    ws.close(1013, "Too many active rooms");
    return;
  }

  const room = getOrCreateRoom(auth.roomId);
  if (room.getNumActiveSessions() >= config.maxWsSessionsPerRoom) {
    ws.close(1013, "Room session limit reached");
    return;
  }

  const sessionId = crypto.randomUUID();

  // tldraw's TLSocketRoom attaches message/close/error listeners internally
  room.handleSocketConnect({
    sessionId,
    socket: ws,
    isReadonly: auth.role === "obs",
  });
}

function clientKey(req: IncomingMessage): string {
  return rateLimitKeyFromHeaders(
    {
      get: (name) => {
        const value = req.headers[name.toLowerCase()];
        return Array.isArray(value) ? value[0] : value;
      },
    },
    req.socket.remoteAddress,
    config.trustProxyHeaders,
  );
}
