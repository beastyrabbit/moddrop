import assert from "node:assert/strict";
import { generateKeyPairSync, randomBytes, sign } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";

test("PostgreSQL and WebSockets preserve canvas state, revoke sessions, and handle ownership loss", {
  skip:
    !process.env.CANVAS_TEST_DATABASE_URL &&
    "Set CANVAS_TEST_DATABASE_URL to an isolated PostgreSQL database",
  timeout: 60_000,
}, async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "canvas-lifecycle-"));
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const origin = "http://localhost:4310";
  Object.assign(process.env, {
    NODE_ENV: "test",
    DATABASE_URL: process.env.CANVAS_TEST_DATABASE_URL,
    UPLOADS_DIR: directory,
    OBJECT_STORAGE_MODE: "filesystem",
    CORS_ORIGINS: origin,
    CLERK_JWT_KEY: publicKey.export({ type: "spki", format: "pem" }),
    CLERK_JWT_ISSUER_DOMAIN: "https://identity.example",
    OBS_TOKEN_SIGNING_SECRET: randomBytes(32).toString("hex"),
  });
  const [
    { db, pool },
    { leaderState },
    { api },
    wsHandler,
    { migrate },
    { serve },
    { WebSocket, WebSocketServer },
    sync,
    tl,
  ] = await Promise.all([
    import("./db.ts"),
    import("./leader.ts"),
    import("./routes.ts"),
    import("./ws-handler.ts"),
    import("drizzle-orm/node-postgres/migrator"),
    import("@hono/node-server"),
    import("ws"),
    import("@tldraw/sync-core"),
    import("tldraw"),
  ]);
  const { streamCanvasSchema } = await import("./tldraw-schema.ts");
  await migrate(db, {
    migrationsFolder: new URL("../drizzle", import.meta.url).pathname,
  });
  const server = serve({ fetch: api.fetch, port: 0, hostname: "127.0.0.1" });
  const wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", (req, socket, head) =>
    wss.handleUpgrade(req, socket, head, (ws) => {
      void wsHandler
        .handleWebSocketUpgrade(ws, req)
        .catch(() => ws.close(1011));
    }),
  );
  if (!server.listening) await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const sockets: InstanceType<typeof WebSocket>[] = [];
  const createdRooms: string[] = [];
  let demotions = 0;
  const unsubscribe = leaderState.onDemote(async (persist) => {
    demotions++;
    await wsHandler.closeAllRooms(persist);
  });
  t.after(async () => {
    t.mock.restoreAll();
    for (const socket of sockets) socket.terminate();
    await leaderState.stop();
    unsubscribe();
    await new Promise<void>((resolve) => wss.close(() => resolve()));
    await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const id of createdRooms)
      await pool.query("DELETE FROM rooms WHERE id = $1", [id]);
    await pool.end();
    await rm(directory, { recursive: true, force: true });
  });
  const owner = `user_${crypto.randomUUID().replaceAll("-", "")}`;
  const member = `user_${crypto.randomUUID().replaceAll("-", "")}`;
  function headers(user = owner) {
    const now = Math.floor(Date.now() / 1000);
    const head = Buffer.from(
      JSON.stringify({ alg: "RS256", typ: "JWT", kid: "local-test" }),
    ).toString("base64url");
    const body = Buffer.from(
      JSON.stringify({
        sub: user,
        iss: "https://identity.example",
        azp: origin,
        iat: now,
        exp: now + 300,
      }),
    ).toString("base64url");
    const signature = sign(
      "RSA-SHA256",
      Buffer.from(`${head}.${body}`),
      privateKey,
    ).toString("base64url");
    return {
      Origin: origin,
      Authorization: `Bearer ${head}.${body}.${signature}`,
      "Content-Type": "application/json",
    };
  }
  async function request(
    path: string,
    method = "GET",
    body?: object,
    user = owner,
  ) {
    const response = await fetch(base + path, {
      method,
      headers: headers(user),
      body: body ? JSON.stringify(body) : undefined,
    });
    assert.ok(response.ok, `${method} ${path}: ${response.status}`);
    return response;
  }
  const created = await Promise.all(
    Array.from({ length: 4 }, () => request("/api/rooms", "POST")),
  );
  const rooms = await Promise.all(
    created.map(
      (response) =>
        response.json() as Promise<{ id: string; obsSetupSecret?: string }>,
    ),
  );
  const roomId = rooms[0]?.id;
  assert.ok(roomId);
  createdRooms.push(roomId);
  assert.equal(new Set(rooms.map((room) => room.id)).size, 1);
  assert.equal(created.filter((response) => response.status === 201).length, 1);
  assert.equal(rooms.filter((room) => room.obsSetupSecret).length, 1);
  const secret = rooms.find((room) => room.obsSetupSecret)?.obsSetupSecret;
  assert.ok(secret);
  await request(`/api/rooms/${roomId}`, "PATCH", { allowedUsers: [member] });
  leaderState.start();
  await until(() => leaderState.isLeader);
  async function connect(token: string) {
    const ws = new WebSocket(
      `${base.replace("http:", "ws:")}/ws?roomId=${roomId}&token=${encodeURIComponent(token)}`,
      { origin },
    );
    const messages: unknown[] = [];
    let closed = false;
    sockets.push(ws);
    ws.on("close", () => {
      closed = true;
    });
    ws.on("message", (data) => {
      messages.push(JSON.parse(data.toString()));
    });
    await once(ws, "open");
    // Admission may perform database reads; ws buffers the protocol handshake.
    ws.send(
      JSON.stringify({
        type: "connect",
        connectRequestId: crypto.randomUUID(),
        lastServerClock: 0,
        // The runtime exports this protocol helper but omits it from public declarations.
        protocolVersion: (
          sync as typeof sync & { getTlsyncProtocolVersion(): number }
        ).getTlsyncProtocolVersion(),
        schema: streamCanvasSchema.serialize(),
      }),
    );
    await until(
      () => messages.some((message) => isMessage(message, "connect")) || closed,
    );
    return {
      ws,
      messages,
      get closed() {
        return closed;
      },
    };
  }
  async function editorToken(user = owner) {
    return (
      (await (
        await request(`/api/rooms/${roomId}/ws-token`, "POST", undefined, user)
      ).json()) as { token: string }
    ).token;
  }
  const obsToken = (
    (await (await request("/obs/token", "POST", { secret })).json()) as {
      token: string;
    }
  ).token;
  const initialEditorToken = await editorToken();
  const loadSnapshot = t.mock.method(db.query.canvasDocuments, "findFirst");
  const findRoom = db.query.rooms.findFirst.bind(db.query.rooms);
  let metadataReads = 0;
  const readMetadata = t.mock.method(
    db.query.rooms,
    "findFirst",
    (...args: Parameters<typeof findRoom>) => {
      if (++metadataReads === 2) throw new Error("Temporary metadata failure");
      return findRoom(...args);
    },
  );
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const failedAdmission = await connect(initialEditorToken);
  assert.equal(failedAdmission.closed, true);
  assert.equal(loadSnapshot.mock.callCount(), 1);
  readMetadata.mock.restore();
  t.mock.timers.tick(30_000);
  // Let the disposal's asynchronous flush finish before reconnecting.
  await delay(20);
  t.mock.timers.reset();
  const editor = await connect(initialEditorToken);
  assert.equal(loadSnapshot.mock.callCount(), 2);
  loadSnapshot.mock.restore();
  const collaborator = await connect(await editorToken(member));
  const mirror = await connect(obsToken);
  for (const connection of [editor, collaborator, mirror]) {
    await until(() =>
      connection.messages.some(
        (message) =>
          isMessage(message, "custom") &&
          JSON.stringify(message).includes('"youtubePolicy":"preview_only"'),
      ),
    );
    const handshake = connection.messages.findIndex((message) =>
      isMessage(message, "connect"),
    );
    const settings = connection.messages.findIndex((message) =>
      isMessage(message, "custom"),
    );
    assert.ok(
      settings > handshake,
      "initial settings follow the completed handshake",
    );
  }
  assert.ok(
    mirror.messages.some(
      (message) => isMessage(message, "connect") && message.isReadonly === true,
    ),
  );
  await request(`/api/rooms/${roomId}`, "PATCH", {
    youtubePolicy: "disabled",
    allowedUsers: [],
  });
  await until(() => collaborator.closed);
  assert.equal(editor.closed, false);
  assert.equal(mirror.closed, false);
  await until(() =>
    mirror.messages.some(
      (message) =>
        isMessage(message, "custom") &&
        JSON.stringify(message).includes('"youtubePolicy":"disabled"'),
    ),
  );

  let releaseWrite: () => void = () => {};
  let writeStarted = false;
  const held = new Promise<void>((resolve) => {
    releaseWrite = resolve;
  });
  const persist = leaderState.persistSnapshot.bind(leaderState);
  t.mock.method(
    leaderState,
    "persistSnapshot",
    async (...args: Parameters<typeof persist>) => {
      writeStarted = true;
      await held;
      return persist(...args);
    },
  );
  const page = tl.PageRecordType.create({
    name: "Latest durable canvas",
    index: "a2" as import("tldraw").IndexKey,
  });
  editor.ws.send(
    JSON.stringify({
      type: "push",
      clientClock: 1,
      diff: { [page.id]: ["put", page] },
    }),
  );
  await until(() => writeStarted);
  await until(() =>
    mirror.messages.some((message) =>
      JSON.stringify(message).includes("Latest durable canvas"),
    ),
  );
  await request(`/api/rooms/${roomId}/regenerate-secret`, "POST");
  await until(() => mirror.closed);
  assert.equal(editor.closed, false);
  const obsolete = await connect(obsToken);
  assert.equal(obsolete.closed, true);
  editor.ws.close();
  await until(() => editor.closed);
  // tldraw removes a disconnected session after its reconnect grace period.
  await delay(6_000);
  let disposalFinished = false;
  const disposal = wsHandler.disposeInactiveRoom(roomId).then(() => {
    disposalFinished = true;
  });
  await delay(20);
  assert.equal(disposalFinished, false);
  const reopening = connect(await editorToken());
  await delay(20);
  releaseWrite();
  await disposal;
  const reopened = await reopening;
  assert.ok(
    reopened.messages.some((message) =>
      JSON.stringify(message).includes("Latest durable canvas"),
    ),
  );
  t.mock.restoreAll();
  const persisted = await pool.query<{ snapshot: unknown }>(
    "SELECT snapshot FROM canvas_documents WHERE room_id = $1",
    [roomId],
  );
  assert.match(
    JSON.stringify(persisted.rows[0]?.snapshot),
    /Latest durable canvas/,
  );
  const lock = await pool.query<{ pid: number }>(
    "SELECT pid FROM pg_locks WHERE locktype = 'advisory' AND objid = 1296315460 AND database = (SELECT oid FROM pg_database WHERE datname = current_database()) AND granted",
  );
  assert.equal(lock.rows.length, 1);
  await pool.query("SELECT pg_terminate_backend($1)", [lock.rows[0]?.pid]);
  await until(() => demotions === 1 && reopened.closed);
  await until(() => leaderState.isLeader);
  assert.equal(demotions, 1);
  const recovered = await connect(await editorToken());
  await until(() =>
    recovered.messages.some(
      (message) =>
        isMessage(message, "custom") &&
        JSON.stringify(message).includes('"youtubePolicy":"disabled"'),
    ),
  );
  assert.ok(
    recovered.messages.some((message) =>
      JSON.stringify(message).includes("Latest durable canvas"),
    ),
  );
});

function isMessage(
  value: unknown,
  type: string,
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    "type" in value &&
    value.type === type
  );
}
async function until(predicate: () => boolean) {
  const end = Date.now() + 10_000;
  while (!predicate()) {
    if (Date.now() >= end) throw new Error("Lifecycle condition timed out");
    await delay(10);
  }
}
