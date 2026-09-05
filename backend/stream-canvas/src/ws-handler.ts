import type { IncomingMessage } from "node:http";
import {
  InMemorySyncStorage,
  type RoomSnapshot,
  TLSocketRoom,
  TLSyncErrorCloseEventReason,
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
import { obsCredentialVersion } from "./obs-secret.ts";
import { withRoomOperation } from "./room-operations.ts";
import { RoomSnapshotWriter } from "./snapshot-writer.ts";

interface ActiveRoom {
  room: TLSocketRoom<TLRecord>;
  storage: InMemorySyncStorage<TLRecord>;
  writer: RoomSnapshotWriter;
  sessions: Map<string, AuthResult>;
  idleTimer?: NodeJS.Timeout;
  disposing?: Promise<void>;
}

const activeRooms = new Map<string, ActiveRoom>();
const roomLoads = new Map<string, Promise<ActiveRoom>>();
let roomEpoch = 0;
const wsFailureLimiter = new FixedWindowRateLimit({
  windowMs: 5 * 60_000,
  max: 30,
});

async function getOrCreateRoom(roomId: string): Promise<ActiveRoom> {
  const existing = activeRooms.get(roomId);
  if (existing?.disposing) {
    await existing.disposing;
    return getOrCreateRoom(roomId);
  }
  if (existing) {
    clearTimeout(existing.idleTimer);
    return existing;
  }

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
  const writer = new RoomSnapshotWriter(
    () => storage.getSnapshot(),
    (snapshot) => leaderState.persistSnapshot(roomId, snapshot),
    `room ${roomId}`,
  );
  const storage = new InMemorySyncStorage<TLRecord>({
    ...(persisted ? { snapshot: persisted.snapshot as RoomSnapshot } : {}),
    onChange() {
      writer.schedule();
    },
  });
  const room = new TLSocketRoom({
    storage,
    schema: streamCanvasSchema,
    onSessionRemoved(_room, { sessionId, numSessionsRemaining }) {
      active.sessions.delete(sessionId);
      if (numSessionsRemaining !== 0 || activeRooms.get(roomId) !== active)
        return;
      scheduleIdleDisposal(roomId, active);
    },
  });
  const active: ActiveRoom = { room, storage, writer, sessions: new Map() };
  activeRooms.set(roomId, active);
  return active;
}

function scheduleIdleDisposal(roomId: string, active: ActiveRoom): void {
  if (
    activeRooms.get(roomId) !== active ||
    active.room.getNumActiveSessions() !== 0
  )
    return;
  clearTimeout(active.idleTimer);
  active.idleTimer = setTimeout(() => {
    if (activeRooms.get(roomId) !== active) return;
    void disposeInactiveRoom(roomId).catch((error) => {
      console.error("[canvas] idle flush failed", error);
      scheduleIdleDisposal(roomId, active);
    });
  }, 30_000);
  active.idleTimer.unref();
}

export async function disposeInactiveRoom(roomId: string): Promise<void> {
  const active = activeRooms.get(roomId);
  if (active?.room.getNumActiveSessions() !== 0) return;
  if (active.disposing) return active.disposing;
  clearTimeout(active.idleTimer);
  active.disposing = (async () => {
    await active.writer.flush();
    if (activeRooms.get(roomId) !== active) return;
    activeRooms.delete(roomId);
    active.writer.stop();
    active.room.close();
  })().finally(() => {
    active.disposing = undefined;
  });
  return active.disposing;
}

export async function closeAllRooms(persist = true): Promise<void> {
  roomEpoch += 1;
  const entries = [...activeRooms.values()];
  activeRooms.clear();
  // Stop accepting edits before taking the final snapshot, including sessions
  // whose WebSocket close handshake has not completed.
  for (const active of entries) {
    clearTimeout(active.idleTimer);
    active.room.close();
    if (!persist) active.writer.stop();
  }
  await Promise.allSettled([...roomLoads.values()]);
  const results = await Promise.allSettled(
    entries.map(async (active) => {
      try {
        if (persist) await active.writer.flush();
      } finally {
        active.writer.stop();
      }
    }),
  );
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length)
    throw new AggregateError(
      failures.map((result) => result.reason),
      "Canvas flush failed",
    );
}

export function roomConfigChanged(
  room: typeof rooms.$inferSelect,
  allowedUsers?: string[],
): void {
  const active = activeRooms.get(room.id);
  if (!active) return;
  for (const [sessionId, auth] of active.sessions) {
    if (
      auth.role === "editor" &&
      allowedUsers &&
      auth.userId !== room.ownerClerkId &&
      !allowedUsers.includes(auth.userId ?? "")
    ) {
      active.room.closeSession(
        sessionId,
        TLSyncErrorCloseEventReason.FORBIDDEN,
      );
    } else {
      active.room.sendCustomMessage(sessionId, roomConfigMessage(room));
    }
  }
}

export function revokeObsSessions(roomId: string): void {
  const active = activeRooms.get(roomId);
  if (!active) return;
  for (const [sessionId, auth] of active.sessions) {
    if (auth.role === "obs")
      active.room.closeSession(
        sessionId,
        TLSyncErrorCloseEventReason.FORBIDDEN,
      );
  }
}

function roomConfigMessage(
  room: Pick<typeof rooms.$inferSelect, "twitchChannel" | "youtubePolicy">,
) {
  return {
    type: "room-config",
    twitchChannel: room.twitchChannel,
    youtubePolicy: room.youtubePolicy,
  };
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
    if (
      !room ||
      obsClaims.credentialVersion !== obsCredentialVersion(room.obsSecret)
    )
      return null;
    return { role: "obs", roomId };
  }

  return null;
}

export async function handleWebSocketUpgrade(
  ws: WebSocket,
  req: IncomingMessage,
): Promise<void> {
  // The client can send its connect frame immediately after HTTP upgrade.
  // Keep it buffered until asynchronous admission installs room listeners.
  ws.pause();
  try {
    await admitWebSocket(ws, req);
  } finally {
    ws.resume();
  }
}

async function admitWebSocket(
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

  const roomId = new URL(
    req.url ?? "",
    "http://stream-canvas.local",
  ).searchParams.get("roomId");
  if (!roomId || !isValidRoomId(roomId)) {
    ws.close(4001, "Unauthorized");
    return;
  }
  await withRoomOperation(roomId, async () => {
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

    let active: ActiveRoom;
    try {
      active = await getOrCreateRoom(auth.roomId);
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
    const { room } = active;
    const metadata = await db.query.rooms.findFirst({
      where: eq(rooms.id, auth.roomId),
    });
    if (
      !metadata ||
      !leaderState.isLeader ||
      activeRooms.get(auth.roomId) !== active ||
      room.isClosed() ||
      ws.readyState !== ws.OPEN
    ) {
      ws.close(1012, "Canvas leader is changing");
      return;
    }
    clearTimeout(active.idleTimer);
    if (room.getNumActiveSessions() >= config.maxWsSessionsPerRoom) {
      ws.close(1013, "Room session limit reached");
      return;
    }

    const sessionId = crypto.randomUUID();
    active.sessions.set(sessionId, auth);
    room.handleSocketConnect({
      sessionId,
      socket: ws,
      isReadonly: auth.role === "obs",
    });
    room.sendCustomMessage(sessionId, roomConfigMessage(metadata));
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
