import assert from "node:assert/strict";
import { generateKeyPairSync, randomBytes, sign } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import type { IncomingMessage } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

const origin = "https://moddrop.localhost:1355";
const issuer = "https://example.clerk.accounts.dev";
const ownerUserId = "user_owner123";
const collaboratorUserId = "user_collab123";
const secondOwnerUserId = "user_second123";

interface ObsTokenResponse {
  roomId: string;
  twitchChannel: string | null;
  token: string;
}

interface AccessibleRoomResponse {
  id: string;
  collaboratorCount: number;
}

interface WsTokenResponse {
  roomId: string;
  token: string;
}

interface UploadResponse {
  id: string;
  filename: string;
}

interface UploadAccessResponse {
  url: string;
}

const tempRoot = await mkdtemp(join(tmpdir(), "stream-canvas-routes-"));
const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "pg-mem://stream-canvas-routes";
process.env.UPLOADS_DIR = join(tempRoot, "uploads");
process.env.CLERK_JWT_KEY = publicKey.export({
  type: "spki",
  format: "pem",
});
process.env.CLERK_JWT_ISSUER_DOMAIN = issuer;
process.env.CORS_ORIGINS = origin;
process.env.OBS_TOKEN_SIGNING_SECRET = randomBytes(32).toString("hex");

const { db, pool } = await import("./db.ts");
after(async () => {
  await pool.end();
  await rm(tempRoot, { recursive: true, force: true });
});

for (const statement of [
  "CREATE TYPE youtube_policy AS ENUM ('disabled', 'preview_only', 'allow_on_air')",
  `CREATE TABLE rooms (
    id uuid PRIMARY KEY,
    owner_clerk_id text NOT NULL UNIQUE,
    twitch_channel text,
    youtube_policy youtube_policy NOT NULL DEFAULT 'preview_only',
    youtube_risk_acknowledged_at timestamptz,
    obs_secret text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE room_members (
    room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    clerk_user_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (room_id, clerk_user_id)
  )`,
  `CREATE TABLE canvas_documents (
    room_id uuid PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
    snapshot jsonb NOT NULL,
    schema_version integer NOT NULL DEFAULT 1,
    revision bigint NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE uploads (
    id uuid PRIMARY KEY,
    room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    filename text NOT NULL,
    mime_type text NOT NULL,
    size integer NOT NULL,
    object_key text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
]) {
  await pool.query(statement);
}

const [
  { api },
  { rooms, roomMembers, uploads },
  { generateObsSecret, hashObsSecret, isHashedObsSecret, verifyObsSecret },
  { mintCanvasWsToken, mintUploadAccessToken },
  { authenticateWebSocketUpgrade },
] = await Promise.all([
  import("./routes.ts"),
  import("./schema.ts"),
  import("./obs-secret.ts"),
  import("./auth.ts"),
  import("./ws-handler.ts"),
]);

const roomId = uuidv4();
const obsSecret = generateObsSecret();
const secondRoomId = uuidv4();
const secondObsSecret = generateObsSecret();

await db.insert(rooms).values({
  id: roomId,
  ownerClerkId: ownerUserId,
  twitchChannel: "BeastyRabbit",
  obsSecret: hashObsSecret(obsSecret),
  createdAt: new Date(),
  updatedAt: new Date(),
});

await db.insert(rooms).values({
  id: secondRoomId,
  ownerClerkId: secondOwnerUserId,
  twitchChannel: "OtherChannel",
  obsSecret: hashObsSecret(secondObsSecret),
  createdAt: new Date(),
  updatedAt: new Date(),
});

await db.insert(roomMembers).values({
  roomId,
  clerkUserId: collaboratorUserId,
});

test("CORS permits the configured origin and bounded authorization preflight", async () => {
  const { app } = await import("./app.ts");
  const response = await app.request("/api/rooms", {
    method: "OPTIONS",
    headers: {
      Origin: origin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization,content-type",
    },
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), origin);
  assert.match(
    response.headers.get("access-control-allow-headers") ?? "",
    /authorization/i,
  );
  const other = await app.request("/api/rooms", {
    method: "OPTIONS",
    headers: {
      Origin: "https://other.example",
      "Access-Control-Request-Method": "POST",
    },
  });
  assert.equal(other.headers.get("access-control-allow-origin"), null);
});

test("the production HTTP boundary rejects standby policy and secret mutations", async () => {
  const { app } = await import("./app.ts");
  const before = await db.select().from(rooms).where(eq(rooms.id, roomId));
  for (const [path, method] of [
    [`/api/rooms/${roomId}`, "PATCH"],
    [`/api/rooms/${roomId}/regenerate-secret`, "POST"],
  ] as const) {
    const response = await app.request(path, { method });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("retry-after"), "2");
  }
  assert.deepEqual(
    await db.select().from(rooms).where(eq(rooms.id, roomId)),
    before,
  );
});

test("object-write and metadata failures leave no successful upload record", async (t) => {
  const { objectStore } = await import("./object-store.ts");
  const before = await db.select().from(uploads);
  const upload = () => {
    const body = new FormData();
    body.set(
      "file",
      new File([Uint8Array.from(minimalPng())], "fixture.png", {
        type: "image/png",
      }),
    );
    return api.request(`/api/rooms/${roomId}/upload`, {
      method: "POST",
      headers: authHeaders(ownerUserId),
      body,
    });
  };
  t.mock.method(objectStore, "put", async () => {
    throw new Error("test object store unavailable");
  });
  assert.equal((await upload()).status, 500);
  assert.equal((await db.select().from(uploads)).length, before.length);
  t.mock.restoreAll();
  const originalRemove = objectStore.remove.bind(objectStore);
  const removed: string[] = [];
  t.mock.method(objectStore, "remove", async (key: string) => {
    removed.push(key);
    await originalRemove(key);
  });
  t.mock.method(db, "insert", () => {
    throw new Error("test metadata insertion failed");
  });
  assert.equal((await upload()).status, 500);
  assert.equal(removed.length, 1);
  assert.equal(await objectStore.stat(removed[0] ?? ""), null);
  assert.equal((await db.select().from(uploads)).length, before.length);
  t.mock.restoreAll();
});

test("OBS token exchange accepts hashed room secrets", async () => {
  const requestBody = JSON.stringify({ secret: obsSecret });
  const response = await api.request("/obs/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": String(Buffer.byteLength(requestBody)),
    },
    body: requestBody,
  });

  assert.equal(response.status, 200);
  const responseBody = (await response.json()) as ObsTokenResponse;
  assert.equal(responseBody.roomId, roomId);
  assert.equal(responseBody.twitchChannel, "BeastyRabbit");
  assert.equal(typeof responseBody.token, "string");
});

test("authenticated room listing does not expose Clerk ID lists", async () => {
  const response = await api.request("/api/rooms/accessible", {
    headers: authHeaders(collaboratorUserId),
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as AccessibleRoomResponse[];
  assert.equal(body.length, 1);
  const firstRoom = body[0];
  assert.ok(firstRoom);
  assert.equal(firstRoom.id, roomId);
  assert.equal(firstRoom.collaboratorCount, 1);
  assert.equal("ownerClerkId" in firstRoom, false);
  assert.equal("allowedUsers" in firstRoom, false);
});

test("authenticated routes reject bad JWT origin, issuer, and oversized bearers", async () => {
  const badOriginResponse = await api.request("/api/rooms/accessible", {
    headers: {
      Authorization: `Bearer ${makeClerkJwt(collaboratorUserId)}`,
      Origin: "https://evil.example",
    },
  });
  assert.equal(badOriginResponse.status, 403);

  const badAzpResponse = await api.request("/api/rooms/accessible", {
    headers: {
      Authorization: `Bearer ${makeClerkJwt(collaboratorUserId, {
        azp: "https://evil.example",
      })}`,
      Origin: origin,
    },
  });
  assert.equal(badAzpResponse.status, 401);

  const badIssuerResponse = await api.request("/api/rooms/accessible", {
    headers: {
      Authorization: `Bearer ${makeClerkJwt(collaboratorUserId, {
        iss: "https://other.clerk.accounts.dev",
      })}`,
      Origin: origin,
    },
  });
  assert.equal(badIssuerResponse.status, 401);

  const oversizedBearerResponse = await api.request("/api/rooms/accessible", {
    headers: {
      Authorization: `Bearer ${"x".repeat(9000)}`,
      Origin: origin,
    },
  });
  assert.equal(oversizedBearerResponse.status, 401);
});

test("authenticated WebSocket token endpoint mints an app-scoped ticket", async () => {
  const rawJwt = makeClerkJwt(collaboratorUserId);
  const response = await api.request(`/api/rooms/${roomId}/ws-token`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${rawJwt}`,
      Origin: origin,
    },
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as WsTokenResponse;
  assert.equal(body.roomId, roomId);
  assert.equal(typeof body.token, "string");
  assert.notEqual(body.token, rawJwt);
  assert.equal(body.token.split(".").length, 2);
});

test("WebSocket upgrade auth accepts app tickets and rejects raw JWTs", async () => {
  const rawJwt = makeClerkJwt(collaboratorUserId);
  const editorTicketResponse = await api.request(
    `/api/rooms/${roomId}/ws-token`,
    {
      method: "POST",
      headers: authHeaders(collaboratorUserId),
    },
  );
  const editorTicket = ((await editorTicketResponse.json()) as WsTokenResponse)
    .token;

  const editorAuth = await authenticateWebSocketUpgrade(
    wsRequest(roomId, editorTicket),
  );
  assert.equal(editorAuth?.role, "editor");
  assert.equal(editorAuth?.userId, collaboratorUserId);

  const obsResponse = await api.request("/obs/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: obsSecret }),
  });
  const obsTicket = ((await obsResponse.json()) as ObsTokenResponse).token;
  const obsAuth = await authenticateWebSocketUpgrade(
    wsRequest(roomId, obsTicket),
  );
  assert.equal(obsAuth?.role, "obs");

  assert.equal(
    await authenticateWebSocketUpgrade(wsRequest(roomId, rawJwt)),
    null,
  );
  assert.equal(
    await authenticateWebSocketUpgrade(wsRequest(secondRoomId, editorTicket)),
    null,
  );
  assert.equal(
    await authenticateWebSocketUpgrade(
      wsRequest(roomId, editorTicket, "https://evil.example"),
    ),
    null,
  );
  assert.equal(
    await authenticateWebSocketUpgrade(
      wsRequest(roomId, mintCanvasWsToken(roomId, "user_notallowed123")),
    ),
    null,
  );
});

test("room settings reject invalid collaborator IDs", async () => {
  const body = JSON.stringify({ allowedUsers: ["not-a-clerk-id"] });
  const response = await api.request(`/api/rooms/${roomId}`, {
    method: "PATCH",
    headers: {
      ...authHeaders(ownerUserId),
      "Content-Type": "application/json",
      "Content-Length": String(Buffer.byteLength(body)),
    },
    body,
  });

  assert.equal(response.status, 400);
});

test("room creation and regeneration only reveal OBS secrets once", async () => {
  const newOwnerId = "user_newowner123";
  const createResponse = await api.request("/api/rooms", {
    method: "POST",
    headers: authHeaders(newOwnerId),
  });
  assert.equal(createResponse.status, 201);
  const created = (await createResponse.json()) as {
    id: string;
    obsSetupSecret: string;
  };
  assert.equal(typeof created.obsSetupSecret, "string");

  const stored = await db.query.rooms.findFirst({
    where: eq(rooms.id, created.id),
  });
  assert.equal(stored ? isHashedObsSecret(stored.obsSecret) : false, true);
  assert.equal(
    stored ? verifyObsSecret(created.obsSetupSecret, stored.obsSecret) : false,
    true,
  );

  const repeatCreateResponse = await api.request("/api/rooms", {
    method: "POST",
    headers: authHeaders(newOwnerId),
  });
  const repeatCreate = (await repeatCreateResponse.json()) as Record<
    string,
    unknown
  >;
  assert.equal("obsSetupSecret" in repeatCreate, false);

  const revealResponse = await api.request(
    `/api/rooms/${created.id}/obs-secret`,
    {
      headers: authHeaders(newOwnerId),
    },
  );
  assert.equal(revealResponse.status, 410);

  const oldSecretExchangeBody = JSON.stringify({
    secret: created.obsSetupSecret,
  });
  const oldSecretExchange = await api.request("/obs/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": String(Buffer.byteLength(oldSecretExchangeBody)),
    },
    body: oldSecretExchangeBody,
  });
  assert.equal(oldSecretExchange.status, 200);

  const regenerateResponse = await api.request(
    `/api/rooms/${created.id}/regenerate-secret`,
    {
      method: "POST",
      headers: authHeaders(newOwnerId),
    },
  );
  assert.equal(regenerateResponse.status, 200);
  const regenerated = (await regenerateResponse.json()) as {
    obsSecret: string;
  };
  assert.notEqual(regenerated.obsSecret, created.obsSetupSecret);

  const rejectedOldSecret = await api.request("/obs/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": String(Buffer.byteLength(oldSecretExchangeBody)),
    },
    body: oldSecretExchangeBody,
  });
  assert.equal(rejectedOldSecret.status, 401);
});

test("invalid upload capabilities do not query metadata or object storage", async (t) => {
  const { objectStore } = await import("./object-store.ts");
  const lookup = t.mock.method(db.query.uploads, "findFirst", async () => {
    throw new Error("Unexpected metadata lookup");
  });
  const stat = t.mock.method(objectStore, "stat", async () => {
    throw new Error("Unexpected object stat");
  });
  for (const suffix of ["", "?token=invalid"]) {
    const response = await api.request(
      `/uploads/${uuidv4()}/test.png${suffix}`,
    );
    assert.equal(response.status, 401);
  }
  assert.equal(lookup.mock.callCount(), 0);
  assert.equal(stat.mock.callCount(), 0);
});

test("uploads use sniffed MIME type and sanitized filenames", async () => {
  const formData = new FormData();
  formData.append(
    "file",
    new File([Uint8Array.from(minimalPng())], "../bad file.png", {
      type: "application/javascript",
    }),
  );

  const response = await api.request(`/api/rooms/${roomId}/upload`, {
    method: "POST",
    headers: {
      ...authHeaders(collaboratorUserId),
      "Content-Length": "1000",
    },
    body: formData,
  });

  assert.equal(response.status, 201);
  const body = (await response.json()) as UploadResponse;
  assert.equal(body.filename, "bad_file.png");

  const upload = await db.query.uploads.findFirst({
    where: eq(uploads.id, body.id),
  });
  assert.equal(upload?.mimeType, "image/png");

  const directMedia = await api.request(
    `/uploads/${body.id}/${encodeURIComponent(body.filename)}`,
  );
  assert.equal(directMedia.status, 401);

  const accessResponse = await api.request(
    `/api/rooms/${roomId}/uploads/${body.id}/access-url`,
    { headers: authHeaders(collaboratorUserId) },
  );
  assert.equal(accessResponse.status, 200);
  const accessBody = (await accessResponse.json()) as UploadAccessResponse;
  assert.match(accessBody.url, /^\/uploads\/.+token=/);

  const signedMedia = await api.request(accessBody.url);
  assert.equal(signedMedia.status, 200);
  assert.equal(signedMedia.headers.get("content-type"), "image/png");
  assert.match(
    signedMedia.headers.get("cache-control") ?? "",
    /^private, max-age=\d+, must-revalidate$/,
  );

  const wrongRoomToken = mintUploadAccessToken(secondRoomId, body.id);
  const mismatchedMedia = await api.request(
    `/uploads/${body.id}/${encodeURIComponent(body.filename)}?token=${wrongRoomToken}`,
  );
  assert.equal(mismatchedMedia.status, 401);

  const crossRoomAccess = await api.request(
    `/api/rooms/${secondRoomId}/uploads/${body.id}/access-url`,
    { headers: authHeaders(secondOwnerUserId) },
  );
  assert.equal(crossRoomAccess.status, 404);

  const obsAccessBody = JSON.stringify({ secret: obsSecret });
  const obsAccess = await api.request(`/obs/uploads/${body.id}/access-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": String(Buffer.byteLength(obsAccessBody)),
    },
    body: obsAccessBody,
  });
  assert.equal(obsAccess.status, 200);

  const crossRoomObsAccessBody = JSON.stringify({ secret: secondObsSecret });
  const crossRoomObsAccess = await api.request(
    `/obs/uploads/${body.id}/access-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(Buffer.byteLength(crossRoomObsAccessBody)),
      },
      body: crossRoomObsAccessBody,
    },
  );
  assert.equal(crossRoomObsAccess.status, 404);
});

function authHeaders(userId: string) {
  return {
    Authorization: `Bearer ${makeClerkJwt(userId)}`,
    Origin: origin,
  };
}

function makeClerkJwt(
  userId: string,
  overrides: Partial<{
    iss: string;
    azp: string;
    iat: number;
    exp: number;
  }> = {},
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlJson({ alg: "RS256", typ: "JWT" });
  const payload = base64UrlJson({
    sub: userId,
    iss: issuer,
    azp: origin,
    iat: now,
    exp: now + 300,
    ...overrides,
  });
  const signed = `${header}.${payload}`;
  const signature = sign(
    "RSA-SHA256",
    Buffer.from(signed),
    privateKey,
  ).toString("base64url");
  return `${signed}.${signature}`;
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function wsRequest(
  requestedRoomId: string,
  token: string,
  requestOrigin = origin,
) {
  return {
    url: `/ws?roomId=${encodeURIComponent(requestedRoomId)}&token=${encodeURIComponent(token)}`,
    headers: { origin: requestOrigin },
  } as unknown as IncomingMessage;
}

function minimalPng(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/axW1kQAAAAASUVORK5CYII=",
    "base64",
  );
}
