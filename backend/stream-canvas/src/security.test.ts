import assert from "node:assert/strict";
import test from "node:test";
import {
  mintCanvasWsToken,
  mintObsToken,
  mintUploadAccessToken,
  validateClerkClaims,
  verifyCanvasWsToken,
  verifyObsToken,
  verifyUploadAccessToken,
} from "./auth.ts";
import {
  generateObsSecret,
  hashObsSecret,
  isHashedObsSecret,
  verifyObsSecret,
} from "./obs-secret.ts";
import { FixedWindowRateLimit, rateLimitKeyFromHeaders } from "./rate-limit.ts";
import { isValidRoomId, validateRoomConfigUpdate } from "./room-validation.ts";
import {
  sanitizeUploadFilename,
  sniffUploadMime,
  validateUploadedMedia,
} from "./upload-validation.ts";

const roomId = "550e8400-e29b-41d4-a716-446655440000";
const userId = "user_2abcDEF123";

test("OBS secrets are hashed and verified without storing plaintext", () => {
  const secret = generateObsSecret();
  const hashed = hashObsSecret(secret);

  assert.notEqual(hashed, secret);
  assert.equal(isHashedObsSecret(hashed), true);
  assert.equal(verifyObsSecret(secret, hashed), true);
  assert.equal(verifyObsSecret("wrong", hashed), false);
  assert.equal(verifyObsSecret(secret, secret), true);
});

test("short-lived OBS and editor WebSocket tokens validate role, scope, and expiry", () => {
  const obsToken = mintObsToken(roomId);
  const obsClaims = verifyObsToken(obsToken);
  assert.equal(obsClaims?.roomId, roomId);
  assert.equal(obsClaims?.role, "obs");
  assert.equal(obsClaims?.scope, "stream-canvas-ws");
  assert.equal(verifyObsToken(`${obsToken}tampered`), null);
  assert.equal(verifyObsToken(obsToken, 9_999_999_999), null);

  const editorToken = mintCanvasWsToken(roomId, userId);
  const editorClaims = verifyCanvasWsToken(editorToken);
  assert.equal(editorClaims?.roomId, roomId);
  assert.equal(editorClaims?.userId, userId);
  assert.equal(editorClaims?.role, "editor");
  assert.equal(verifyCanvasWsToken(`${editorToken}tampered`), null);
  assert.equal(verifyCanvasWsToken(editorToken, 9_999_999_999), null);

  const uploadToken = mintUploadAccessToken(roomId, roomId);
  const uploadClaims = verifyUploadAccessToken(uploadToken);
  assert.equal(uploadClaims?.roomId, roomId);
  assert.equal(uploadClaims?.uploadId, roomId);
  assert.equal(uploadClaims?.scope, "stream-canvas-upload");
  assert.equal(verifyUploadAccessToken(`${uploadToken}tampered`), null);
  assert.equal(verifyUploadAccessToken(uploadToken, 9_999_999_999), null);
});

test("Clerk claim validation requires issuer and authorized party match", () => {
  const claims = {
    sub: userId,
    iss: "https://example.clerk.accounts.dev",
    azp: "https://frontend.localhost:1355",
    iat: 1,
    exp: 2,
  };

  assert.doesNotThrow(() =>
    validateClerkClaims(claims, {
      issuer: "https://example.clerk.accounts.dev",
      origin: "https://frontend.localhost:1355",
      authorizedParties: ["https://frontend.localhost:1355"],
    }),
  );

  assert.throws(() =>
    validateClerkClaims(claims, {
      issuer: "https://other.example",
      origin: "https://frontend.localhost:1355",
      authorizedParties: ["https://frontend.localhost:1355"],
    }),
  );
  assert.throws(() =>
    validateClerkClaims(claims, {
      issuer: "https://example.clerk.accounts.dev",
      origin: "https://attacker.example",
      authorizedParties: ["https://frontend.localhost:1355"],
    }),
  );
});

test("room config validation normalizes bounded values", () => {
  assert.equal(isValidRoomId(roomId), true);
  assert.equal(isValidRoomId("not-a-room"), false);

  const result = validateRoomConfigUpdate(
    {
      twitchChannel: " BeastyRabbit ",
      allowedUsers: [userId, userId, "user_other123", "user_owner"],
    },
    "user_owner",
  );

  assert.deepEqual(result, {
    ok: true,
    value: {
      twitchChannel: "BeastyRabbit",
      allowedUsers: [userId, "user_other123"],
    },
  });

  assert.deepEqual(
    validateRoomConfigUpdate({ twitchChannel: "not a channel" }, userId),
    {
      ok: false,
      error: "Twitch channel must be 3-25 letters, numbers, or underscores",
    },
  );
});

test("upload validation sniffs signatures and sanitizes filenames", () => {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/axW1kQAAAAASUVORK5CYII=",
    "base64",
  );
  assert.equal(
    sniffUploadMime(png),
    "image/png",
  );
  assert.equal(
    sniffUploadMime(Buffer.from("524946460000000057454250", "hex")),
    "image/webp",
  );
  assert.equal(sniffUploadMime(Buffer.from("not really an image")), null);
  assert.equal(
    sniffUploadMime(Buffer.from("1a45dfa300000000", "hex"), "audio/webm"),
    "audio/webm",
  );
  assert.deepEqual(validateUploadedMedia(png, "image/png"), {
    ok: true,
  });
  assert.deepEqual(
    validateUploadedMedia(Buffer.from("89504e470d0a1a0a", "hex"), "image/png"),
    {
      ok: false,
      error: "File appears to be truncated",
    },
  );
  assert.deepEqual(
    validateUploadedMedia(Buffer.alloc(0), "application/javascript"),
    {
      ok: false,
      error: "File type not allowed",
    },
  );
  assert.equal(
    sanitizeUploadFilename("../bad name<script>.png"),
    "bad_name_script.png",
  );
});

test("fixed-window rate limiter blocks after the configured allowance", () => {
  const limiter = new FixedWindowRateLimit({ windowMs: 1000, max: 2 });

  assert.equal(limiter.consume("key", 0).allowed, true);
  assert.equal(limiter.consume("key", 10).allowed, true);
  assert.equal(limiter.consume("key", 20).allowed, false);
  assert.equal(limiter.consume("key", 1001).allowed, true);
});

test("fixed-window rate limiter evicts high-cardinality keys", () => {
  const limiter = new FixedWindowRateLimit({
    windowMs: 10_000,
    max: 1,
    maxEntries: 2,
  });

  limiter.consume("first", 0);
  limiter.consume("second", 1);
  limiter.consume("third", 2);

  assert.equal(limiter.consume("first", 3).allowed, true);
});

test("rate-limit keys ignore proxy headers unless explicitly trusted", () => {
  const headers = {
    get: (name: string) =>
      name === "x-forwarded-for" ? "203.0.113.50" : undefined,
  };

  assert.equal(
    rateLimitKeyFromHeaders(headers, "198.51.100.10", false),
    "198.51.100.10",
  );
  assert.equal(
    rateLimitKeyFromHeaders(headers, "198.51.100.10", true),
    "203.0.113.50",
  );
});
