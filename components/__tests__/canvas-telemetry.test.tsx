// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { CanvasEditor } from "@/components/stream-canvas/CanvasEditor";
import { getEditorWsToken } from "@/lib/stream-canvas/api";
import { ReportedError, reportError } from "@/lib/telemetry/browser-errors";
import { track } from "@/lib/telemetry/events";

const mocks = vi.hoisted(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({ matches: false, addEventListener() {} }),
  });
  return { error: new Error("Connection failed") };
});
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ getToken: vi.fn() }) }));
vi.mock("@tldraw/sync", () => ({
  useSync: () => ({ status: "error", error: mocks.error }),
}));
vi.mock("@/lib/telemetry/browser-errors", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/telemetry/browser-errors")>()),
  reportError: vi.fn(),
}));
vi.mock("@/lib/telemetry/events", () => ({ track: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

test("the canvas skips a token request failure already reported by the API", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
  );
  const error = await getEditorWsToken(
    "room-fixture",
    async () => "test-token",
  ).catch((error: unknown) => error);
  if (!(error instanceof ReportedError))
    throw new Error("Expected a reported API error");
  mocks.error = error;
  render(<CanvasEditor roomId="room-fixture" youtubePolicy="preview_only" />);
  expect(screen.getByText("Connection error: Failed to fetch")).toBeTruthy();
  expect(reportError).toHaveBeenCalledTimes(1);
  expect(track).toHaveBeenCalledExactlyOnceWith("failure", {
    operation: "api",
    reason: "network",
  });
});

test("the canvas still reports a new connection failure", () => {
  mocks.error = new Error("Connection failed");
  render(<CanvasEditor roomId="room-fixture" youtubePolicy="preview_only" />);
  expect(reportError).toHaveBeenCalledExactlyOnceWith(mocks.error);
  expect(track).toHaveBeenCalledExactlyOnceWith("failure", {
    operation: "canvas",
    reason: "network",
  });
});
