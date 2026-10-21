// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { CookieConsentConfig } from "vanilla-cookieconsent";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const consent = vi.hoisted(() => ({
  run: vi.fn<(config: CookieConsentConfig) => Promise<void>>(),
  reset: vi.fn(),
  acceptedCategory: vi.fn(() => false),
  setLanguage: vi.fn(),
  showPreferences: vi.fn(),
}));
const navigation = vi.hoisted(() => ({ pathname: "/privacy" }));
vi.mock("vanilla-cookieconsent", () => consent);
vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
}));
vi.mock("next/web-vitals", () => ({ useReportWebVitals: vi.fn() }));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isSignedIn: false }),
  useClerk: () => ({ addListener: () => () => {} }),
}));
vi.mock("../browser-errors", () => ({ startErrorReporting: vi.fn() }));

const config = {
  host: "https://analytics.invalid",
  website: "fixture",
  domains: "localhost",
};
const appConfig = {
  umami: config,
  errors: {
    dsn: undefined,
    release: undefined,
    environment: "test",
    tracesSampleRate: 0,
  },
};
let analytics: typeof import("../analytics");
let cookies: typeof import("../consent");
let events: typeof import("../events");
let Telemetry: typeof import("@/components/telemetry").Telemetry;
let CookieSettings: typeof import("@/components/cookie-settings").CookieSettings;
let ready: ReturnType<typeof Promise.withResolvers<void>>;
let options: CookieConsentConfig;
const nativeFetch = vi.fn<typeof fetch>();

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  navigation.pathname = "/privacy";
  window.history.replaceState(null, "", "/privacy");
  ready = Promise.withResolvers<void>();
  consent.acceptedCategory.mockReturnValue(false);
  // Model the real singleton: subsequent run() calls cannot install callbacks.
  consent.run.mockImplementation((config) => {
    options = config;
    return ready.promise;
  });
  nativeFetch
    .mockReset()
    .mockImplementation(async () => Response.json({ enabled: true }));
  vi.stubGlobal("fetch", nativeFetch);
  analytics = await import("../analytics");
  cookies = await import("../consent");
  events = await import("../events");
  ({ Telemetry } = await import("@/components/telemetry"));
  ({ CookieSettings } = await import("@/components/cookie-settings"));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.head.innerHTML = "";
  delete window.umami;
});

function mount() {
  return render(
    <>
      <Telemetry config={appConfig} />
      <CookieSettings />
    </>,
  );
}
async function finishConsent(accepted = true) {
  await act(async () => {
    consent.acceptedCategory.mockReturnValue(accepted);
    ready.resolve();
    await ready.promise;
  });
}
function loadTracker() {
  window.umami = {
    track: vi.fn(async (payload) => {
      await window.fetch(`${config.host}/api/send`, {
        body: JSON.stringify({ type: "event", payload }),
      });
    }),
  };
  document
    .querySelector('script[src$="/script.js"]:last-of-type')
    ?.dispatchEvent(new Event("load"));
}
async function sendEvent(host = config.host) {
  return window.fetch(`${host}/api/send`, {
    body: JSON.stringify({
      type: "event",
      payload: { url: "/?token=private", title: "private" },
    }),
  });
}
function changeConsent(accepted: boolean) {
  consent.acceptedCategory.mockReturnValue(accepted);
  options.onChange?.({
    cookie: {
      categories: accepted ? ["necessary", "analytics"] : ["necessary"],
      revision: 0,
      data: null,
      consentId: "fixture",
      consentTimestamp: "2026-10-21T00:00:00Z",
      lastConsentTimestamp: "2026-10-21T00:00:00Z",
      languageCode: "en",
      services: {},
      expirationTime: 0,
    },
    changedCategories: ["analytics"],
    changedServices: {},
  });
}

it("mount → accept → unmount → remount resumes through the same native transport", async () => {
  const first = mount();
  const guard = window.fetch;
  await sendEvent();
  expect(nativeFetch).not.toHaveBeenCalled();
  await finishConsent();
  loadTracker();
  expect(nativeFetch).toHaveBeenCalledOnce();
  first.unmount();
  await sendEvent();
  expect(nativeFetch).toHaveBeenCalledOnce();
  const second = mount();
  await finishConsent();
  loadTracker();
  expect(window.fetch).toBe(guard);
  expect(nativeFetch).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("button", { name: "Cookie settings" })).toBeTruthy();
  second.unmount();
});

it("unmount before consent resolves → remount ignores old completion and keeps settings visible", async () => {
  const first = mount();
  first.unmount();
  mount();
  await finishConsent();
  expect(consent.run).toHaveBeenCalledOnce();
  expect(consent.reset).not.toHaveBeenCalled();
  expect(document.querySelectorAll("script")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Cookie settings" }));
  expect(consent.showPreferences).toHaveBeenCalledOnce();
  loadTracker();
  expect(nativeFetch).toHaveBeenCalledOnce();
  act(() => changeConsent(true));
  expect(consent.acceptedCategory).toHaveBeenCalled();
});

it.each(["old-first", "new-first"])(
  "overlapping consent owners, %s cleanup, share one run and only the newest can stop it",
  async (order) => {
    const oldNotify = vi.fn();
    const newNotify = vi.fn();
    const oldStart = cookies.startConsent(oldNotify);
    const newStart = cookies.startConsent(newNotify);
    ready.resolve();
    const [oldStop, newStop] = await Promise.all([oldStart, newStart]);
    expect(consent.run).toHaveBeenCalledOnce();
    expect(oldNotify).not.toHaveBeenCalled();
    expect(newNotify).toHaveBeenCalledExactlyOnceWith(false);
    if (order === "old-first") {
      oldStop();
      expect(cookies.isConsentRunning()).toBe(true);
      changeConsent(true);
      expect(newNotify).toHaveBeenLastCalledWith(true);
      newStop();
    } else {
      newStop();
      oldStop();
    }
    expect(consent.reset).toHaveBeenCalledExactlyOnceWith(false);
    expect(cookies.isConsentRunning()).toBe(false);
  },
);

it("completed successor survives late cleanup and abort of its predecessor", async () => {
  const abort = new AbortController();
  const oldStart = cookies.startConsent(vi.fn(), abort.signal);
  ready.resolve();
  const oldStop = await oldStart;
  const notify = vi.fn();
  const stop = await cookies.startConsent(notify);
  abort.abort();
  oldStop();
  changeConsent(true);
  expect(notify).toHaveBeenLastCalledWith(true);
  expect(cookies.isConsentRunning()).toBe(true);
  expect(consent.reset).not.toHaveBeenCalled();
  stop();
});

it("aborted initialization resets only after settling, with no replacement", async () => {
  const abort = new AbortController();
  const notify = vi.fn();
  const pending = cookies.startConsent(notify, abort.signal);
  abort.abort();
  expect(consent.reset).not.toHaveBeenCalled();
  ready.resolve();
  const stop = await pending;
  stop();
  expect(consent.reset).toHaveBeenCalledOnce();
  expect(notify).not.toHaveBeenCalled();
  expect(cookies.isConsentRunning()).toBe(false);
});

it("accept → withdraw blocks flushes before reload and cannot restart while reload is pending", async () => {
  const reload = vi.fn();
  const instance = analytics.createAnalytics(config, reload);
  const pending = cookies.startConsent(instance.setConsent);
  ready.resolve();
  const stop = await pending;
  changeConsent(true);
  loadTracker();
  changeConsent(false);
  expect(reload).toHaveBeenCalledOnce();
  const sent = nativeFetch.mock.calls.length;
  await sendEvent();
  changeConsent(true);
  await sendEvent();
  expect(nativeFetch).toHaveBeenCalledTimes(sent);
  expect(document.querySelectorAll("script")).toHaveLength(0);
  stop();
  instance.dispose();
});

it.each([false, true])(
  "enter /obs with scripts loaded=%s reloads only after load",
  async (loaded) => {
    const reload = vi.fn();
    const instance = analytics.createAnalytics(config, reload);
    instance.setConsent(loaded);
    instance.dispose();
    window.history.replaceState(null, "", "/obs");
    instance.dispose(true);
    instance.dispose(true);
    expect(reload).toHaveBeenCalledTimes(Number(loaded));
    await sendEvent();
    expect(nativeFetch).not.toHaveBeenCalled();
  },
);

it("OBS entry after recovery still reloads for a recorder loaded by an earlier mount", () => {
  const first = analytics.createAnalytics(config, vi.fn());
  first.setConsent(true);
  first.dispose();
  const reload = vi.fn();
  const second = analytics.createAnalytics(config, reload);
  second.dispose(true);
  expect(reload).toHaveBeenCalledOnce();
});

it("global-error reset with saved consent resumes analytics and preserves scrubbing and recorder settings", async () => {
  const first = mount();
  await finishConsent();
  loadTracker();
  const guard = window.fetch;
  first.unmount();
  nativeFetch.mockClear();
  await sendEvent();
  expect(nativeFetch).not.toHaveBeenCalled();
  mount();
  await finishConsent();
  loadTracker();
  await sendEvent();
  await window.fetch(`${config.host}/api/record`, {
    body: JSON.stringify({
      type: "record",
      payload: {
        events: [{ textContent: "private", attributes: { value: "private" } }],
      },
    }),
  });
  const response = await window.fetch(
    `${config.host}/api/websites/fixture/recorder`,
  );
  expect(await response.json()).toMatchObject({
    enabled: true,
    maskLevel: "strict",
    blockSelector: expect.stringContaining("[data-telemetry-private]"),
  });
  expect(window.fetch).toBe(guard);
  expect(nativeFetch).toHaveBeenCalledTimes(4);
  for (const [, init] of nativeFetch.mock.calls) {
    expect(init).toMatchObject({
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    expect(init?.body ?? "").not.toMatch(/private|token/);
  }
});

it("stale analytics disposal, callbacks and config cannot disturb the active owner", async () => {
  const staleReload = vi.fn();
  const first = analytics.createAnalytics(config, staleReload);
  first.setConsent(true);
  const script = document.querySelector("script");
  const second = analytics.createAnalytics(
    { ...config, host: "https://successor.invalid" },
    vi.fn(),
  );
  second.setConsent(true);
  const tracker = vi.fn().mockResolvedValue(undefined);
  window.umami = { track: tracker };
  document
    .querySelector('script[src^="https://successor.invalid/"]')
    ?.dispatchEvent(new Event("load"));
  tracker.mockClear();
  first.dispose(true);
  first.setConsent(false);
  script?.dispatchEvent(new Event("load"));
  events.track("room_created", {});
  expect(tracker).toHaveBeenCalledOnce();
  expect(staleReload).not.toHaveBeenCalled();
  nativeFetch.mockClear();
  await sendEvent();
  expect(nativeFetch).not.toHaveBeenCalled();
  await sendEvent("https://successor.invalid");
  expect(nativeFetch).toHaveBeenCalledOnce();
  second.dispose();
});

it("a late retired script cannot replace the active instance's captured tracker", () => {
  const first = analytics.createAnalytics(config, vi.fn());
  first.setConsent(true);
  const oldScript = document.querySelector("script");
  first.dispose();
  const second = analytics.createAnalytics(config, vi.fn());
  second.setConsent(true);
  loadTracker();
  const currentTracker = window.umami?.track;
  const staleTracker = vi.fn().mockResolvedValue(undefined);
  window.umami = { track: staleTracker };
  oldScript?.dispatchEvent(new Event("load"));
  events.track("room_created", {});
  expect(currentTracker).toHaveBeenCalledTimes(2);
  expect(staleTracker).not.toHaveBeenCalled();
  second.dispose();
});

it("recorder settings resolving after replacement cannot enable a retired recorder", async () => {
  const response = Promise.withResolvers<Response>();
  nativeFetch.mockReturnValueOnce(response.promise);
  const first = analytics.createAnalytics(config, vi.fn());
  first.setConsent(true);
  const pending = window.fetch(`${config.host}/api/websites/fixture/recorder`);
  const second = analytics.createAnalytics(config, vi.fn());
  first.dispose();
  second.setConsent(true);
  response.resolve(Response.json({ enabled: true }));
  expect(await (await pending).json()).toEqual({});
  second.dispose();
});
