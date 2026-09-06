import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import type { IncomingMessage } from "node:http";
import test from "node:test";
import type { WebSocket } from "ws";

Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL: "pg-mem://admission",
  OBJECT_STORAGE_MODE: "filesystem",
  CORS_ORIGINS: "http://localhost:4310",
  MAX_ACTIVE_ROOMS: "1",
});
const { handleWebSocketUpgrade, closeAllRooms } = await import(
  "./ws-handler.ts"
);
const { leaderState } = await import("./leader.ts");
const { db, closeDatabase } = await import("./db.ts");
const { mintCanvasWsToken } = await import("./auth.ts");
test.after(async () => {
  await closeAllRooms(false);
  await closeDatabase();
});

class Socket extends EventEmitter {
  readonly OPEN = 1;
  readyState = 1;
  closeCode?: number;
  terminated = 0;
  pause() {}
  resume() {}
  close(code: number) {
    this.closeCode = code;
    this.readyState = 3;
  }
  terminate() {
    this.terminated++;
    this.readyState = 3;
  }
  get ws() {
    return this as unknown as WebSocket;
  }
}

function request(roomId: string): IncomingMessage {
  return {
    url: `/ws?roomId=${roomId}&token=${mintCanvasWsToken(roomId, "user_owner")}`,
    headers: { origin: "http://localhost:4310" },
    socket: { remoteAddress: "127.0.0.1" },
  } as IncomingMessage;
}

test("socket error handling outlives rejected admission and session listeners", async () => {
  leaderState.isLeader = false;
  const socket = new Socket();
  await handleWebSocketUpgrade(
    socket.ws,
    request("11111111-1111-4111-8111-111111111111"),
  );
  assert.equal(socket.closeCode, 1012);
  assert.doesNotThrow(() =>
    socket.emit("error", new Error("controlled connection error")),
  );
  assert.equal(socket.terminated, 1);
});

test("pending room loads reserve capacity across distinct room admission queues", async (t) => {
  leaderState.isLeader = true;
  let release: () => void = () => {};
  let started: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  const loading = new Promise<void>((resolve) => {
    started = resolve;
  });
  let reads = 0;
  const firstId = "11111111-1111-4111-8111-111111111111";
  const secondId = "22222222-2222-4222-8222-222222222222";
  t.mock.method(db.query.rooms, "findFirst", async () => ({
    ownerClerkId: "user_owner",
  }));
  t.mock.method(db.query.canvasDocuments, "findFirst", async () => {
    reads++;
    started();
    await pending;
    return undefined;
  });
  const first = new Socket();
  const admission = handleWebSocketUpgrade(first.ws, request(firstId));
  await loading;
  try {
    const second = new Socket();
    await handleWebSocketUpgrade(second.ws, request(secondId));
    assert.equal(second.closeCode, 1013);
    assert.equal(reads, 1);
    // An error during pending authentication/loading is also contained.
    assert.doesNotThrow(() =>
      first.emit("error", new Error("controlled pending error")),
    );
  } finally {
    release();
    await admission;
    await closeAllRooms(false);
    leaderState.isLeader = false;
  }
});
