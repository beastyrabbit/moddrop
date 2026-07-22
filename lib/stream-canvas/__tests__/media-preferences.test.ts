import { describe, expect, it } from "vitest";
import {
  getMediaPreferencesStorageKey,
  parsePreferences,
} from "@/components/stream-canvas/media-preferences";

describe("per-user media preferences", () => {
  it("isolates preferences by Clerk user and room", () => {
    expect(getMediaPreferencesStorageKey("user_one", "room-a")).not.toBe(
      getMediaPreferencesStorageKey("user_two", "room-a"),
    );
    expect(getMediaPreferencesStorageKey("user_one", "room-a")).not.toBe(
      getMediaPreferencesStorageKey("user_one", "room-b"),
    );
    expect(getMediaPreferencesStorageKey(null, "room-a")).toBeNull();
  });

  it("uses muted defaults and clamps stored volume", () => {
    expect(
      parsePreferences({
        video: { enabled: true, volume: 4 },
        audio: { enabled: "yes", volume: -2 },
        invalid: null,
      }),
    ).toEqual({
      video: { enabled: true, volume: 1 },
      audio: { enabled: false, volume: 0 },
    });
  });
});
