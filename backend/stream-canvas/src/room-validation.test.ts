import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_ALLOWED_USERS,
  validateRoomConfigUpdate,
} from "./room-validation.ts";

const owner = "user_owner";

test("room updates preserve omitted fields and normalize empty channels", () => {
  assert.deepEqual(validateRoomConfigUpdate({}, owner), {
    ok: true,
    value: {},
  });
  for (const twitchChannel of [null, "", "  "]) {
    assert.deepEqual(validateRoomConfigUpdate({ twitchChannel }, owner), {
      ok: true,
      value: { twitchChannel: null },
    });
  }
  assert.deepEqual(
    validateRoomConfigUpdate({ twitchChannel: " Abc_123 " }, owner),
    {
      ok: true,
      value: { twitchChannel: "Abc_123" },
    },
  );
});

test("room updates reject malformed fields and preserve validation order", () => {
  const cases: [unknown, string][] = [
    [null, "Invalid JSON body"],
    [[], "Invalid JSON body"],
    [new Date(), "Invalid JSON body"],
    [{ twitchChannel: undefined }, "Twitch channel must be a string"],
    [
      { twitchChannel: "ab" },
      "Twitch channel must be 3-25 letters, numbers, or underscores",
    ],
    [
      { twitchChannel: "a".repeat(26) },
      "Twitch channel must be 3-25 letters, numbers, or underscores",
    ],
    [{ allowedUsers: null }, "Allowed users must be an array"],
    [{ allowedUsers: [1] }, "Allowed user IDs must be strings"],
    [{ allowedUsers: ["other"] }, "Invalid Clerk user ID"],
    [{ allowedUsers: [`user_${"a".repeat(124)}`] }, "Invalid Clerk user ID"],
    [{ youtubePolicy: "invalid" }, "Invalid YouTube policy"],
    [
      { acknowledgeYouTubeRisk: "true" },
      "YouTube risk acknowledgement must be boolean",
    ],
    [
      { twitchChannel: false, allowedUsers: null, youtubePolicy: "invalid" },
      "Twitch channel must be a string",
    ],
  ];
  for (const [input, error] of cases) {
    assert.deepEqual(validateRoomConfigUpdate(input, owner), {
      ok: false,
      error,
    });
  }
});

test("room member limits apply before deduplication and owner removal", () => {
  assert.deepEqual(
    validateRoomConfigUpdate(
      { allowedUsers: Array(MAX_ALLOWED_USERS + 1).fill(owner) },
      owner,
    ),
    {
      ok: false,
      error: `Allowed users cannot exceed ${MAX_ALLOWED_USERS}`,
    },
  );
  assert.deepEqual(
    validateRoomConfigUpdate(
      { allowedUsers: [" user_first ", owner, "user_first", "user_second"] },
      owner,
    ),
    {
      ok: true,
      value: { allowedUsers: ["user_first", "user_second"] },
    },
  );
  const allowedUsers = Array.from(
    { length: MAX_ALLOWED_USERS },
    (_, i) => `user_${i}`,
  );
  assert.deepEqual(validateRoomConfigUpdate({ allowedUsers }, owner), {
    ok: true,
    value: { allowedUsers },
  });
});

test("YouTube on-air policy requires acknowledgement in the same update", () => {
  for (const acknowledgeYouTubeRisk of [undefined, false]) {
    const input =
      acknowledgeYouTubeRisk === undefined
        ? { youtubePolicy: "allow_on_air" }
        : { youtubePolicy: "allow_on_air", acknowledgeYouTubeRisk };
    assert.deepEqual(validateRoomConfigUpdate(input, owner), {
      ok: false,
      error: "Allowing YouTube on air requires risk acknowledgement",
    });
  }
  for (const youtubePolicy of ["disabled", "preview_only", "allow_on_air"]) {
    const input = { youtubePolicy, acknowledgeYouTubeRisk: true };
    assert.deepEqual(validateRoomConfigUpdate(input, owner), {
      ok: true,
      value: input,
    });
  }
});
