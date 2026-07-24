import { afterEach, describe, expect, it, vi } from "vitest";
import { getSyncedMediaPlaybackPosition } from "@/lib/stream-canvas/media-playback";

describe("getSyncedMediaPlaybackPosition", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the stored position while paused", () => {
    expect(
      getSyncedMediaPlaybackPosition({
        isPlaying: false,
        playbackPosition: 42,
        playbackUpdatedAt: 0,
      }),
    ).toBe(42);
  });

  it("adds elapsed wall-clock time while playing", () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    expect(
      getSyncedMediaPlaybackPosition({
        isPlaying: true,
        playbackPosition: 5,
        playbackUpdatedAt: 7_000,
      }),
    ).toBe(8);
  });

  it("ignores playbackUpdatedAt values from the future", () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    expect(
      getSyncedMediaPlaybackPosition({
        isPlaying: true,
        playbackPosition: 5,
        playbackUpdatedAt: 20_000,
      }),
    ).toBe(5);
  });

  it("defaults missing fields to zero", () => {
    expect(getSyncedMediaPlaybackPosition({})).toBe(0);
  });
});
