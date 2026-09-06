// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { useMediaUrl } from "@/components/stream-canvas/use-media-url";
import {
  resolveEditorUploadUrl,
  getEditorUploadUrlRefreshDelayMs,
} from "@/lib/stream-canvas/api";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("a mounted source recovers after the initial quick retries are exhausted", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const resolver = {
    resolveUrl: vi.fn().mockRejectedValue(new Error("API unavailable")),
    getRefreshDelayMs: () => undefined,
  };
  const { result, unmount } = renderHook(() => useMediaUrl("audio", resolver));
  await act(() => vi.advanceTimersByTimeAsync(6_000));
  expect(resolver.resolveUrl).toHaveBeenCalledTimes(4);
  expect(result.current.url).toBe("");
  resolver.resolveUrl.mockResolvedValue("recovered-url");
  await act(() => vi.advanceTimersByTimeAsync(30_000));
  expect(result.current.url).toBe("recovered-url");
  expect(resolver.resolveUrl).toHaveBeenCalledTimes(5);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

test("successful forced recovery signals a reload even for an unchanged URL", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const resolver = {
    resolveUrl: vi.fn().mockResolvedValue("same-url"),
    getRefreshDelayMs: () => undefined,
  };
  const { result } = renderHook(() => useMediaUrl("audio", resolver));
  await act(async () => {});
  expect(result.current.reloadVersion).toBe(0);
  resolver.resolveUrl.mockRejectedValueOnce(new Error("Temporary failure"));
  await act(async () => result.current.recover());
  expect(result.current.reloadVersion).toBe(0);
  await act(() => vi.advanceTimersByTimeAsync(1_000));
  expect(resolver.resolveUrl).toHaveBeenLastCalledWith("audio", {
    forceRefresh: true,
  });
  expect(result.current.url).toBe("same-url");
  expect(result.current.reloadVersion).toBe(1);
});

test("mounted copies share renewal at expiry without replacing valid media every minute", async () => {
  const fetcher = vi.fn(async () =>
    Response.json({
      url: `/uploads/shared/audio.wav?version=${Date.now()}`,
      expiresIn: 3600,
    }),
  );
  vi.stubGlobal("fetch", fetcher);
  const resolver = {
    resolveUrl: (src: string, options?: { forceRefresh?: boolean }) =>
      resolveEditorUploadUrl(
        "audio-room",
        src,
        async () => "local-test-token",
        options,
      ),
    getRefreshDelayMs: (src: string) =>
      getEditorUploadUrlRefreshDelayMs("audio-room", src),
  };
  const { result } = renderHook(() => [
    useMediaUrl("/uploads/shared/audio.wav", resolver),
    useMediaUrl("/uploads/shared/audio.wav", resolver),
  ]);
  await act(async () => {});
  expect(fetcher).toHaveBeenCalledTimes(1);
  const first = result.current[0].url;
  await act(() => vi.advanceTimersByTimeAsync(60_000));
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(result.current[0].url).toBe(first);
  await act(() => vi.advanceTimersByTimeAsync(3_510_000));
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(result.current[0].url).not.toBe(first);
  expect(result.current[0].url).toBe(result.current[1].url);
  const headers = fetcher.mock.calls[0];
  expect(headers).toBeDefined();
});

test("unmount cancels retries and late URL resolution cannot replace a new source", async () => {
  let finish: (url: string) => void = () => {};
  const resolver = {
    resolveUrl: vi.fn((src: string) =>
      src === "old"
        ? new Promise<string>((resolve) => {
            finish = resolve;
          })
        : Promise.resolve("new-url"),
    ),
    getRefreshDelayMs: () => undefined,
  };
  const { result, rerender, unmount } = renderHook(
    ({ src }) => useMediaUrl(src, resolver),
    { initialProps: { src: "old" } },
  );
  rerender({ src: "new" });
  await act(async () => {});
  await act(async () => finish("obsolete-url"));
  expect(result.current.url).toBe("new-url");
  unmount();
  await vi.runAllTimersAsync();
  expect(resolver.resolveUrl).toHaveBeenCalledTimes(2);
});
