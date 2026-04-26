import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getEditorUploadUrlRefreshDelayMs,
  resolveEditorUploadUrl,
} from "@/lib/stream-canvas/api";

describe("upload URL refresh timing", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports when an internal upload URL needs proactive re-resolution", async () => {
    const roomId = "00000000-0000-4000-8000-000000000001";
    const uploadId = "00000000-0000-4000-8000-000000000002";
    const src = `/uploads/${uploadId}/media.png`;
    const getToken = vi.fn().mockResolvedValue("clerk-token");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          url: `${src}?token=signed-token`,
          expiresIn: 60,
        }),
      ),
    );

    expect(getEditorUploadUrlRefreshDelayMs(roomId, src)).toBeNull();

    const resolved = await resolveEditorUploadUrl(roomId, src, getToken);
    expect(resolved).toBe(
      `http://stream-canvas.localhost:1355${src}?token=signed-token`,
    );

    const delay = getEditorUploadUrlRefreshDelayMs(roomId, src);
    expect(delay).toBeGreaterThan(0);
    expect(delay).toBeLessThanOrEqual(30_000);
  });

  it("does not schedule refreshes for external media URLs", () => {
    expect(
      getEditorUploadUrlRefreshDelayMs(
        "00000000-0000-4000-8000-000000000003",
        "https://example.com/media.png",
      ),
    ).toBeUndefined();
  });
});
