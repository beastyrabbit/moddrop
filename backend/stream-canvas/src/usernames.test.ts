import assert from "node:assert/strict";
import test from "node:test";
import {
  escapeLikePattern,
  normalizeClerkUserIdList,
  normalizeUsernamePrefix,
  sanitizeUsername,
  usernameSearchKey,
} from "./usernames.ts";

test("usernames trim separators and keep only safe characters", () => {
  for (const [raw, expected] of [
    ["__--Ada_-Lovelace!!--__", "Ada_-Lovelace"],
    [`a${"_".repeat(100_000)}b`, `a${"_".repeat(29)}`],
    [`___${"a".repeat(40)}___`, "a".repeat(30)],
    ["_-!!-_", ""],
  ] as const) {
    assert.equal(sanitizeUsername(raw), expected);
  }
});

test("username search prefixes are normalized, capped, and escaped", () => {
  assert.equal(
    normalizeUsernamePrefix("  BeastyRabbitExtraLongUsername  "),
    "beastyrabbitextralongusername",
  );
  assert.equal(normalizeUsernamePrefix("a".repeat(60)).length, 30);
  assert.equal(usernameSearchKey("BeastyRabbit"), "beastyrabbit");
  assert.equal(escapeLikePattern(String.raw`a_b%c\d`), String.raw`a\_b\%c\\d`);
});

test("username resolution input is deduped, bounded, and capped", () => {
  const normalized = normalizeClerkUserIdList([
    " user_a ",
    "user_a",
    "",
    `user_${"x".repeat(200)}`,
    ...Array.from({ length: 60 }, (_, index) => `user_${index}`),
  ]);

  assert.equal(normalized[0], "user_a");
  assert.equal(normalized.length, 50);
  assert.equal(new Set(normalized).size, normalized.length);
  assert.ok(normalized.every((userId) => userId.length <= 128));
});
