import type { IncomingMessage } from "node:http";
import {
  InMemorySyncStorage,
  type RoomSnapshot,
  TLSocketRoom,
} from "@tldraw/sync-core";
import { and, eq } from "drizzle-orm";
import type { TLRecord } from "tldraw";
import type { WebSocket } from "ws";
import {
  isOriginAllowed,
  verifyCanvasWsToken,
  verifyObsToken,
} from "./auth.ts";
import { config } from "./config.ts";
import { db } from "./db.ts";
import { leaderState } from "./leader.ts";
import { FixedWindowRateLimit, rateLimitKeyFromHeaders } from "./rate-limit.ts";
import { isValidRoomId } from "./room-validation.ts";
import { canvasDocuments, roomMembers, rooms } from "./schema.ts";
import { streamCanvasSchema } from "./tldraw-schema.ts";
import type { ConnectionRole } from "./types.ts";

interface ActiveRoom {
  room: TLSocketRoom<TLRecord>;
  storage: InMemorySyncStorage<TLRecord>;
  writer: RoomSnapshotWriter;
}

const activeRooms = new Map<string, ActiveRoom>();
const roomLoads = new Map<string, Promise<ActiveRoom>>();
let roomEpoch = 0;
const wsFailureLimiter = new FixedWindowRateLimit({
  windowMs: 5 * 60_000,
  max: 30,
});

class RoomSnapshotWriter {
  private pending: RoomSnapshot | null = null;
  private drainPromise: Promise<void> | null = null;
  private readonly roomId: string;

  constructor(roomId: string) {
    this.roomId = roomId;
  }

  schedule(snapshot: RoomSnapshot): void {
    this.pending = snapshot;
    if (!this.drainPromise) {
      this.drainPromise = this.drain()
        .catch(async (error) => {
          console.error(
            `[canvas] snapshot persistence failed for room ${this.roomId}; retrying`,
            error,
          );
          await new Promise((resolve) => setTimeout(resolve, 1_000));
        })
        .finally(() => {
          this.drainPromise = null;
          if (this.pending) this.schedule(this.pending);
        });
    }
  }

  async flush(snapshot?: RoomSnapshot): Promise<void> {
    if (snapshot) this.schedule(snapshot);
    while (this.drainPromise) await this.drainPromise;
  }

  private async drain(): Promise<void> {
    while (this.pending) {
      const snapshot = this.pending;
      this.pending = null;
      try {
        await db
          .insert(canvasDocuments)
          .values({
            roomId: this.roomId,
            snapshot,
            revision: snapshot.documentClock,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: canvasDocuments.roomId,
            set: {
              snapshot,
              revision: snapshot.documentClock,
              updatedAt: new Date(),
            },
          });
      } catch (error) {
        // Keep a newer pending snapshot if one arrived while this write ran.
        this.pending ??= snapshot;
        throw error;
      }
    }
  }
}

async function getOrCreateRoom(roomId: string): Promise<ActiveRoom> {
  const existing = activeRooms.get(roomId);
  if (existing) return existing;

  const loading = roomLoads.get(roomId);
  if (loading) return loading;

  const epoch = roomEpoch;
  const promise = loadRoom(roomId, epoch).finally(() =>
    roomLoads.delete(roomId),
  );
  roomLoads.set(roomId, promise);
  return promise;
}

async function loadRoom(roomId: string, epoch: number): Promise<ActiveRoom> {
  const persisted = await db.query.canvasDocuments.findFirst({
    where: eq(canvasDocuments.roomId, roomId),
  });
  if (epoch !== roomEpoch) {
    throw new Error("Room load cancelled during leadership handover");
  }
  const writer = new RoomSnapshotWriter(roomId);
  const storage = new InMemorySyncStorage<TLRecord>({
    ...(persisted ? { snapshot: persisted.snapshot as RoomSnapshot } : {}),
    onChange() {
      writer.schedule(storage.getSnapshot());
    },
  });
  const room = new TLSocketRoom({
    storage,
    schema: streamCanvasSchema,
    onSessionRemoved(_room, { numSessionsRemaining }) {
      if (numSessionsRemaining !== 0) return;
      setTimeout(() => void disposeInactiveRoom(roomId), 30_000);
    },
  });
  const active = { room, storage, writer };
  activeRooms.set(roomId, active);
  return active;
}

async function disposeInactiveRoom(roomId: string): Promise<void> {
  const active = activeRooms.get(roomId);
  if (active?.room.getNumActiveSessions() !== 0) return;
  activeRooms.delete(roomId);
  await active.writer.flush(active.storage.getSnapshot());
  active.room.close();
}

export async function closeAllRooms(): Promise<void> {
  roomEpoch += 1;
  await Promise.allSettled([...roomLoads.values()]);
  const entries = [...activeRooms.values()];
  activeRooms.clear();
  await Promise.all(
    entries.map(async ({ room, storage, writer }) => {
      await writer.flush(storage.getSnapshot());
      room.close();
    }),
  );
}

interface AuthResult {
  role: ConnectionRole;
  roomId: string;
  userId?: string;
}

export async function authenticateWebSocketUpgrade(
  req: IncomingMessage,
): Promise<AuthResult | null> {
  const origin = req.headers.origin;
  if (!isOriginAllowed(origin)) {
    console.warn("[ws] rejected: invalid origin", origin);
    return null;
  }

  const url = new URL(req.url ?? "", "http://stream-canvas.local");
  const roomId = url.searchParams.get("roomId");
  const token = url.searchParams.get("token");
  if (!roomId || !token || !isValidRoomId(roomId)) return null;

  const editorClaims = verifyCanvasWsToken(token);
  if (editorClaims && editorClaims.roomId === roomId) {
    const room = await db.query.rooms.findFirst({
      where: eq(rooms.id, roomId),
    });
    if (!room) return null;
    const isOwner = room.ownerClerkId === editorClaims.userId;
    const member = isOwner
      ? null
      : await db.query.roomMembers.findFirst({
          where: and(
            eq(roomMembers.roomId, roomId),
            eq(roomMembers.clerkUserId, editorClaims.userId),
          ),
        });
    if (!isOwner && !member) return null;
    return { role: "editor", roomId, userId: editorClaims.userId };
  }

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

export async function handleWebSocketUpgrade(
  ws: WebSocket,
  req: IncomingMessage,
): Promise<void> {
  if (!leaderState.isLeader) {
    ws.close(1012, "Canvas leader is changing");
    return;
  }
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
  if (!leaderState.isLeader) {
    ws.close(1012, "Canvas leader is changing");
    return;
  }

  if (
    !activeRooms.has(auth.roomId) &&
    activeRooms.size >= config.maxActiveRooms
  ) {
    ws.close(1013, "Too many active rooms");
    return;
  }

  let room: TLSocketRoom<TLRecord>;
  try {
    ({ room } = await getOrCreateRoom(auth.roomId));
  } catch (error) {
    if (!leaderState.isLeader) {
      ws.close(1012, "Canvas leader is changing");
      return;
    }
    throw error;
  }
  if (!leaderState.isLeader) {
    ws.close(1012, "Canvas leader is changing");
    return;
  }
  if (room.getNumActiveSessions() >= config.maxWsSessionsPerRoom) {
    ws.close(1013, "Room session limit reached");
    return;
  }

  room.handleSocketConnect({
    sessionId: crypto.randomUUID(),
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
