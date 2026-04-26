import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { generateKeyPairSync, sign } from "node:crypto";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

const origin = "https://frontend.localhost:1355";
const issuer = "https://example.clerk.accounts.dev";
const ownerUserId = "user_owner123";
const collaboratorUserId = "user_collab123";

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

const tempRoot = await mkdtemp(join(tmpdir(), "stream-canvas-routes-"));
const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

process.env.DATABASE_PATH = join(tempRoot, "stream-canvas.db");
process.env.UPLOADS_DIR = join(tempRoot, "uploads");
process.env.CLERK_JWT_KEY = publicKey.export({
  type: "spki",
  format: "pem",
});
process.env.CLERK_JWT_ISSUER_DOMAIN = issuer;
process.env.CORS_ORIGINS = origin;
process.env.OBS_TOKEN_SIGNING_SECRET = "test-signing-secret";

const [
  { api },
  { db },
  { rooms, uploads },
  { generateObsSecret, hashObsSecret },
] = await Promise.all([
  import("./routes.ts"),
  import("./db.ts"),
  import("./schema.ts"),
  import("./obs-secret.ts"),
]);

const roomId = uuidv4();
const obsSecret = generateObsSecret();

await db.insert(rooms).values({
  id: roomId,
  ownerClerkId: ownerUserId,
  twitchChannel: "BeastyRabbit",
  obsSecret: hashObsSecret(obsSecret),
  allowedUsers: [collaboratorUserId],
  createdAt: new Date(),
  updatedAt: new Date(),
});

test("OBS token exchange accepts hashed room secrets", async () => {
  const response = await api.request("/obs/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: obsSecret }),
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as ObsTokenResponse;
  assert.equal(body.roomId, roomId);
  assert.equal(body.twitchChannel, "BeastyRabbit");
  assert.equal(typeof body.token, "string");
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

test("room settings reject invalid collaborator IDs", async () => {
  const response = await api.request(`/api/rooms/${roomId}`, {
    method: "PATCH",
    headers: {
      ...authHeaders(ownerUserId),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ allowedUsers: ["not-a-clerk-id"] }),
  });

  assert.equal(response.status, 400);
});

test("uploads use sniffed MIME type and sanitized filenames", async () => {
  const formData = new FormData();
  formData.append(
    "file",
    new File([Buffer.from("89504e470d0a1a0a", "hex")], "../bad file.png", {
      type: "application/javascript",
    }),
  );

  const response = await api.request(`/api/rooms/${roomId}/upload`, {
    method: "POST",
    headers: authHeaders(collaboratorUserId),
    body: formData,
  });

  assert.equal(response.status, 201);
  const body = (await response.json()) as UploadResponse;
  assert.equal(body.filename, "bad_file.png");

  const upload = await db.query.uploads.findFirst({
    where: eq(uploads.id, body.id),
  });
  assert.equal(upload?.mimeType, "image/png");
});

function authHeaders(userId: string) {
  return {
    Authorization: `Bearer ${makeClerkJwt(userId)}`,
    Origin: origin,
  };
}

function makeClerkJwt(userId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlJson({ alg: "RS256", typ: "JWT" });
  const payload = base64UrlJson({
    sub: userId,
    iss: issuer,
    azp: origin,
    iat: now,
    exp: now + 300,
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
