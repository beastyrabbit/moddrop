// @vitest-environment jsdom
import * as Sentry from "@sentry/browser";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { getEditorWsToken, uploadFile } from "@/lib/stream-canvas/api";
import {
  ReportedError,
  reportBoundaryError,
  reportError,
  startErrorReporting,
} from "../browser-errors";
import { setAnalyticsTracker } from "../events";

const telemetry = vi.hoisted(() => ({ events: [] as unknown[] }));
vi.mock("@sentry/browser", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sentry/browser")>();
  return {
    ...actual,
    init: (options: Parameters<typeof actual.init>[0]) =>
      actual.init({
        ...options,
        transport: () => ({
          send: async (envelope) => {
            for (const [header, payload] of envelope[1]) {
              if (header.type === "event") telemetry.events.push(payload);
            }
            return { statusCode: 200 };
          },
          flush: async () => true,
        }),
      }),
  };
});

let stopReporting: () => void;
beforeAll(async () => {
  stopReporting = startErrorReporting({
    dsn: "https://public@errors.invalid/10",
    environment: "test",
    release: undefined,
    tracesSampleRate: 0,
  });
  await vi.waitFor(() => expect(Sentry.getClient()).toBeDefined());
});
afterEach(async () => {
  await Sentry.flush(2_000);
  telemetry.events.length = 0;
  setAnalyticsTracker();
  vi.unstubAllGlobals();
});
afterAll(async () => {
  stopReporting();
  await Sentry.close();
});

it("does not report server render errors with a Next.js digest from a client boundary", async () => {
  reportBoundaryError(
    Object.assign(new Error("Server render failed"), { digest: "fixture" }),
  );
  await Sentry.flush(2_000);
  expect(telemetry.events).toHaveLength(0);
});

it("reports a client boundary error without a digest once", async () => {
  reportBoundaryError(new Error("Client render failed"));
  await Sentry.flush(2_000);
  expect(telemetry.events).toHaveLength(1);
  expect(JSON.stringify(telemetry.events)).toContain("Client render failed");
});

it("does not report an already reported error from a client boundary", async () => {
  reportBoundaryError(new ReportedError("Already reported"));
  await Sentry.flush(2_000);
  expect(telemetry.events).toHaveLength(0);
});

it.each(["upload", "api"] as const)(
  "%s network failures emit one event even when a caller logs the error",
  async (operation) => {
    const cause = new TypeError("Failed to fetch");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(cause));
    const track = vi.fn();
    setAnalyticsTracker(track);
    const request =
      operation === "upload"
        ? uploadFile(
            "room-fixture",
            new File(["fixture"], "fixture.png", { type: "image/png" }),
            async () => "fixture-token",
          )
        : getEditorWsToken("room-fixture", async () => "fixture-token");
    const error: unknown = await request.catch((error: unknown) => error);
    expect(error).toBeInstanceOf(ReportedError);
    if (!(error instanceof ReportedError))
      throw new Error("Expected ReportedError");
    expect(error.cause).toBe(cause);
    expect(error.message).toBe("Failed to fetch");
    reportError(error);
    console.error("Caller request failed", error);
    await Sentry.flush(2_000);
    expect(telemetry.events).toHaveLength(1);
    expect(JSON.stringify(telemetry.events)).toContain(
      operation === "upload"
        ? "Canvas upload network request failed"
        : "Canvas API network request failed",
    );
    expect(track).toHaveBeenCalledExactlyOnceWith(
      operation === "upload" ? "upload_failed" : "failure",
      operation === "upload"
        ? { reason: "network" }
        : { operation: "api", reason: "network" },
    );
  },
);

it("keeps API rejection messages useful and drops their console duplicates", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ error: "Please try again" }, { status: 503 }),
      ),
  );
  const error: unknown = await getEditorWsToken(
    "room-fixture",
    async () => "fixture-token",
  ).catch((error: unknown) => error);
  expect(error).toBeInstanceOf(ReportedError);
  if (!(error instanceof ReportedError))
    throw new Error("Expected ReportedError");
  expect(error.message).toBe("Please try again");
  expect(error.cause).toBeInstanceOf(Error);
  console.error("Caller API rejection", error);
  await Sentry.flush(2_000);
  expect(telemetry.events).toHaveLength(1);
});

it("drops a reported error even when another console argument is the original exception", async () => {
  console.error(
    "Caller wrapped failure",
    new Error("Earlier console argument"),
    new ReportedError("Already reported"),
  );
  await Sentry.flush(2_000);
  expect(telemetry.events).toHaveLength(0);
});

it("drops reported exceptions and unnormalized console arguments before scrubbing", async () => {
  Sentry.captureException(new ReportedError("Already reported exception"));
  const beforeSend = Sentry.getClient()?.getOptions().beforeSend;
  expect(
    await beforeSend?.(
      {
        type: undefined,
        extra: { arguments: [new ReportedError("Already reported console")] },
      },
      {},
    ),
  ).toBeNull();
  await Sentry.flush(2_000);
  expect(telemetry.events).toHaveLength(0);
});

it("still captures new console errors and scrubs their private paths", async () => {
  console.error(
    "New console failure",
    new Error("GET /api/rooms/private/members"),
  );
  await Sentry.flush(2_000);
  expect(telemetry.events).toHaveLength(1);
  expect(JSON.stringify(telemetry.events)).toContain(
    "GET /api/rooms/[redacted]",
  );
  expect(JSON.stringify(telemetry.events)).not.toContain("private/members");
});
