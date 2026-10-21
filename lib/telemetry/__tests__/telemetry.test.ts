// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  safePath,
  scrubTelemetry,
} from "@/backend/stream-canvas/src/telemetry/scrub";
import {
  analyticsAllowed,
  createAnalytics,
  isBot,
  isOverlay,
  scrubRecording,
} from "../analytics";
import { telemetryConfig } from "../config";
import {
  beginAuth,
  completeAuth,
  outboundHost,
  setAnalyticsTracker,
  track,
  vitalEvent,
} from "../events";

const config = {
  host: "https://analytics.invalid",
  website: "fixture",
  domains: "localhost",
};
afterEach(() => {
  vi.unstubAllGlobals();
  setAnalyticsTracker();
  document.head.innerHTML = "";
  delete window.umami;
});
describe("runtime config", () => {
  it("disables both transports when unset", () => {
    expect(telemetryConfig({}).umami).toBeUndefined();
    expect(telemetryConfig({}).errors.dsn).toBeUndefined();
  });
  it("requires a valid host, website and domain", () => {
    expect(
      telemetryConfig({
        UMAMI_HOST_URL: "javascript:bad",
        UMAMI_WEBSITE_ID: "id",
        UMAMI_DOMAINS: "localhost",
      }).umami,
    ).toBeUndefined();
    expect(
      telemetryConfig({ UMAMI_HOST_URL: config.host }).umami,
    ).toBeUndefined();
    expect(
      telemetryConfig({
        UMAMI_HOST_URL: config.host,
        UMAMI_WEBSITE_ID: "id",
        UMAMI_DOMAINS: "localhost",
      }).umami?.host,
    ).toBe(config.host);
  });
  it("defaults environment and clamps sample rate", () => {
    const parsed = telemetryConfig({
      GLITCHTIP_DSN: "https://public@errors.invalid/10",
      GLITCHTIP_TRACES_SAMPLE_RATE: "2",
      APP_RELEASE: "moddrop@1.0.0",
    });
    expect(parsed.errors.environment).toBe("production");
    expect(parsed.errors.tracesSampleRate).toBe(0.05);
    expect(parsed.errors.release).toBe("moddrop@1.0.0");
  });
});
describe("privacy scrubber", () => {
  it("retains HTTP methods and scrubs transactions and span URL descriptions", () => {
    expect(
      scrubTelemetry({
        transaction: "GET /app/rooms/abc?token=fixture",
        spans: [
          { description: "GET /api/rooms/:id" },
          { description: "POST /api/users/user_2abc/settings?email=fixture" },
          {
            description: "GET https://moddrop.live/app/rooms/abc?token=fixture",
          },
          {
            description:
              "fetch https://moddrop.live/api/users/user_2abc?token=fixture",
          },
          {
            description:
              "/profile/user_2abc/person%40example.com?token=fixture",
          },
        ],
      }),
    ).toEqual({
      transaction: "GET /app/rooms/[redacted]",
      spans: [
        { description: "GET /api/rooms/[redacted]" },
        { description: "POST /api/users/[redacted]" },
        { description: "GET /app/rooms/[redacted]" },
        { description: "fetch /api/users/[redacted]" },
        { description: "/profile/[redacted]/[redacted]" },
      ],
    });
  });
  it("removes identity, request secrets and nested diagnostic objects", () => {
    const event = scrubTelemetry({
      user: { email: "test@example.invalid" },
      request: {
        headers: { Authorization: "Bearer fixture" },
        cookies: "fixture",
        data: "fixture",
        url: "https://moddrop.live/obs?secret=fixture#token=other",
      },
      extra: { private: "fixture" },
      contexts: { nested: { token: "fixture" } },
    });
    expect(event).toEqual({
      request: { url: "/obs" },
      contexts: { nested: {} },
    });
  });
  it("scrubs emails, bearer credentials, JWTs, URLs and query fragments in errors", () => {
    const result = scrubTelemetry({
      message:
        'person@example.com Bearer synthetic-credential eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature https://moddrop.live/obs?secret=fixture#secret=fixture token=fixture obsSecret: "synthetic spaced credential"',
    });
    expect(result.message).not.toMatch(
      /person@|synthetic-credential|eyJ|=fixture|synthetic spaced credential/,
    );
  });
  it("removes room identifiers, filenames, search and fragments from paths", () => {
    expect(
      safePath(
        "https://moddrop.live/app/rooms/room-id?token=fixture#secret=fixture",
      ),
    ).toBe("/app/rooms/[redacted]");
    expect(safePath("/uploads/id/private-file.png?token=fixture")).toBe(
      "/uploads/[redacted]",
    );
  });
  it("bounds deeply nested values", () => {
    let value: unknown = "private";
    for (let i = 0; i < 50; i++) value = { nested: value };
    expect(JSON.stringify(scrubTelemetry(value))).not.toContain("private");
  });
  it("masks replay text and attributes and discards fragmented records", () => {
    const recording = scrubRecording([
      {
        type: 2,
        data: {
          node: {
            tagName: "input",
            textContent: "Person",
            attributes: { value: "person@example.com", src: "private-media" },
          },
          href: "https://moddrop.live/obs?secret=fixture",
        },
      },
      {
        type: "umami:rrweb-event-fragment",
        data: { value: "private-fragment" },
      },
    ]);
    const result = JSON.stringify(recording);
    expect(result).not.toMatch(/Person|person@|private-|fixture/);
    expect(result).toContain('"tagName":"input"');
  });
  it("preserves bundled app layout without media URLs or input attributes", () => {
    expect(
      scrubRecording({
        attributes: {
          class: "app-shell",
          style: "width: 400px; height: 300px; background-image: url(private)",
          value: "private",
        },
      }),
    ).toEqual({
      attributes: {
        class: "app-shell",
        style: "width: 400px; height: 300px",
      },
    });
    const css = scrubRecording({
      attributes: {
        href: "/_next/static/chunks/site.css",
        _cssText: ".app{background:url(private-media)}",
        title: "private",
      },
    });
    expect(JSON.stringify(css)).not.toContain("private");
    expect(JSON.stringify(css)).toContain("site.css");
    expect(
      scrubRecording({
        type: 3,
        data: { attributes: [{ id: 1, attributes: { value: "private" } }] },
      }),
    ).toEqual({ type: 3, data: { attributes: [{ id: 1, attributes: {} }] } });
    expect(
      scrubRecording({
        type: "click",
        url: "https://app.invalid/?secret=private",
      }),
    ).toEqual({ type: "click", url: `${window.location.origin}/` });
  });
});
describe("consent and analytics", () => {
  it("cannot restart analytics when consent arrives after disposal", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetch);
    const analytics = createAnalytics(config, vi.fn());
    const ready = Promise.withResolvers<boolean>();
    const starting = ready.promise.then(analytics.setConsent);
    analytics.dispose();
    const restoredFetch = window.fetch;
    const tracker = vi.fn();
    window.umami = { track: tracker };
    ready.resolve(true);
    await starting;
    analytics.pageview();
    track("room_created", {});
    expect(document.querySelectorAll("script")).toHaveLength(0);
    expect(window.fetch).toBe(restoredFetch);
    expect(tracker).not.toHaveBeenCalled();
    await window.fetch("/unrelated");
    expect(fetch).toHaveBeenCalledExactlyOnceWith("/unrelated");
  });
  it("ignores late script loads and keeps the fetch guard after loaded analytics are disposed", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const analytics = createAnalytics(config, vi.fn());
    analytics.setConsent(true);
    const script = document.querySelector("script");
    expect(script).not.toBeNull();
    const guardedFetch = window.fetch;
    analytics.dispose();
    const tracker = vi.fn();
    window.umami = { track: tracker };
    analytics.setConsent(true);
    script?.dispatchEvent(new Event("load"));
    analytics.pageview();
    track("room_created", {});
    expect(document.querySelectorAll("script")).toHaveLength(0);
    expect(window.fetch).toBe(guardedFetch);
    expect(tracker).not.toHaveBeenCalled();
    await window.fetch(`${config.host}/api/record`, { body: "private" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("blocks late flushes on generic unmount without reloading, and reloads only on overlay entry", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const reload = vi.fn();
    const analytics = createAnalytics(config, reload);
    analytics.setConsent(true);
    analytics.dispose();
    expect(reload).not.toHaveBeenCalled();
    await window.fetch(`${config.host}/api/record`, { body: "private" });
    expect(fetch).not.toHaveBeenCalled();
    analytics.dispose(true);
    expect(reload).toHaveBeenCalledOnce();
  });
  it("excludes overlays, bots and non-matching domains", () => {
    expect(isOverlay("/obs")).toBe(true);
    expect(isOverlay("/obs/child")).toBe(true);
    expect(isOverlay("/observer")).toBe(false);
    expect(isBot("HeadlessChrome")).toBe(true);
    expect(
      analyticsAllowed(
        config,
        true,
        { hostname: "preview.invalid", pathname: "/" },
        "Chrome",
      ),
    ).toBe(false);
    expect(
      analyticsAllowed(
        config,
        false,
        { hostname: "localhost", pathname: "/" },
        "Chrome",
      ),
    ).toBe(false);
    expect(
      analyticsAllowed(
        config,
        true,
        { hostname: "localhost", pathname: "/" },
        "Chrome",
      ),
    ).toBe(true);
  });
  it("loads only after consent and blocks the recorder's final flush on withdrawal", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(Response.json({ cache: "memory-only" }));
    vi.stubGlobal("fetch", fetch);
    const reload = vi.fn();
    const analytics = createAnalytics(config, reload);
    expect(document.querySelectorAll("script")).toHaveLength(0);
    analytics.setConsent(true);
    expect(document.querySelector("script")?.src).toBe(
      `${config.host}/script.js`,
    );
    const tracker = vi.fn();
    window.umami = { track: tracker };
    document.querySelector("script")?.dispatchEvent(new Event("load"));
    expect(document.querySelectorAll("script")).toHaveLength(2);
    analytics.pageview();
    expect(tracker).toHaveBeenCalledTimes(1);
    analytics.setConsent(false);
    expect(reload).toHaveBeenCalledOnce();
    expect(document.querySelectorAll("script")).toHaveLength(0);
    await window.fetch(`${config.host}/api/record`, { body: "private" });
    expect(fetch).not.toHaveBeenCalled();
    analytics.dispose();
  });
  it("sends only safe metadata and recording structures to the configured host", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({}));
    vi.stubGlobal("fetch", fetch);
    const analytics = createAnalytics(config, vi.fn());
    analytics.setConsent(true);
    await window.fetch(`${config.host}/api/send`, {
      body: JSON.stringify({
        type: "event",
        payload: {
          url: "https://private.invalid/?token=fixture",
          title: "private title",
          referrer: "private",
          website: "fixture",
        },
      }),
    });
    expect(fetch.mock.calls[0][1].body).not.toMatch(/private|token/);
    expect(fetch.mock.calls[0][1].referrerPolicy).toBe("no-referrer");
    analytics.dispose();
  });
  it("does not queue events before consent or replay them later", () => {
    const callback = vi.fn();
    track("room_created", {});
    setAnalyticsTracker(callback);
    expect(callback).not.toHaveBeenCalled();
    track("upload_failed", { reason: "network" });
    expect(callback).toHaveBeenCalledExactlyOnceWith("upload_failed", {
      reason: "network",
    });
    setAnalyticsTracker();
    track("room_created", {});
    expect(callback).toHaveBeenCalledTimes(1);
  });
  it("auth attempts do not cross the consent boundary or complete twice", () => {
    const callback = vi.fn();
    beginAuth("sign_in");
    setAnalyticsTracker(callback);
    completeAuth();
    expect(callback).not.toHaveBeenCalled();
    beginAuth("sign_in");
    completeAuth();
    completeAuth();
    expect(callback.mock.calls.map(([event]) => event)).toEqual([
      "auth_started",
      "auth_completed",
    ]);
    beginAuth("sign_up");
    setAnalyticsTracker();
    setAnalyticsTracker(callback);
    callback.mockClear();
    completeAuth();
    expect(callback).not.toHaveBeenCalled();
  });
  it("rounds vitals and expresses CLS in thousandths", () => {
    expect(vitalEvent({ name: "LCP", value: 1234.5, rating: "good" })).toEqual({
      name: "LCP",
      value: 1235,
      rating: "good",
    });
    expect(
      vitalEvent({ name: "CLS", value: 0.12345, rating: "needs-improvement" })
        .value,
    ).toBe(123);
  });
  it("outbound delegation returns only the destination host", () => {
    const anchor = document.createElement("a");
    anchor.href = "https://external.invalid/path?secret=fixture";
    anchor.innerHTML = "<span>Go</span>";
    expect(outboundHost(anchor.firstElementChild, "https://moddrop.live")).toBe(
      "external.invalid",
    );
    anchor.href = "https://moddrop.live/privacy";
    expect(outboundHost(anchor, "https://moddrop.live")).toBeUndefined();
    anchor.href = "mailto:person@example.com";
    expect(outboundHost(anchor, "https://moddrop.live")).toBeUndefined();
  });
});
