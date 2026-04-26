import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const OBS_SECRET_PREFIX = "obs_secret_sha256_v1:";
const OBS_SECRET_HASH_CONTEXT = "moddrop-stream-canvas-obs-secret-v1";

export function generateObsSecret(): string {
  return `obs_${randomBytes(32).toString("base64url")}`;
}

export function hashObsSecret(secret: string): string {
  return `${OBS_SECRET_PREFIX}${createHash("sha256")
    .update(OBS_SECRET_HASH_CONTEXT)
    .update("\0")
    .update(secret)
    .digest("base64url")}`;
}

export function isHashedObsSecret(value: string): boolean {
  return value.startsWith(OBS_SECRET_PREFIX);
}

export function verifyObsSecret(secret: string, storedSecret: string): boolean {
  const expected = isHashedObsSecret(storedSecret)
    ? storedSecret
    : hashObsSecret(storedSecret);
  const actual = hashObsSecret(secret);
  return constantTimeEqual(actual, expected);
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}
