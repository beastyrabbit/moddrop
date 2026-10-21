// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import GlobalError from "@/app/global-error";
import {
  consentLanguage,
  isConsentRunning,
  isGermanLegalPath,
  startConsent,
} from "@/lib/telemetry/consent";
import { CookieSettings } from "../cookie-settings";

const mocks = vi.hoisted(() => ({
  run: vi.fn<
    (options: { onConsent: () => void; onChange: () => void }) => Promise<void>
  >(),
  reset: vi.fn(),
  showPreferences: vi.fn(),
  acceptedCategory: vi.fn(() => false),
  pathname: "/privacy",
}));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
vi.mock("vanilla-cookieconsent", () => ({
  run: mocks.run,
  reset: mocks.reset,
  showPreferences: mocks.showPreferences,
  acceptedCategory: mocks.acceptedCategory,
}));
let stop: (() => void) | undefined;
afterEach(() => {
  act(() => stop?.());
  stop = undefined;
  cleanup();
  vi.clearAllMocks();
  mocks.acceptedCategory.mockReturnValue(false);
  mocks.pathname = "/privacy";
  window.history.replaceState(null, "", "/");
  document.documentElement.lang = "";
});

it.each([
  ["/datenschutz", true, "de", "Cookie-Einstellungen"],
  ["/datenschutz/", true, "de", "Cookie-Einstellungen"],
  ["/impressum//", true, "de", "Cookie-Einstellungen"],
  ["/privacy", false, "en", "Cookie settings"],
  ["/", false, "en", "Cookie settings"],
] as const)(
  "uses consistent legal-page language on %s",
  async (pathname, german, language, label) => {
    mocks.pathname = pathname;
    window.history.replaceState(null, "", pathname);
    document.documentElement.lang = "en";
    expect(isGermanLegalPath(pathname)).toBe(german);
    expect(consentLanguage()).toBe(language);
    mocks.run.mockResolvedValue(undefined);
    stop = await startConsent(vi.fn());
    expect(mocks.run).toHaveBeenCalledWith(
      expect.objectContaining({
        language: expect.objectContaining({ default: language }),
      }),
    );
    render(<CookieSettings />);
    expect(screen.getByRole("button", { name: label })).toBeTruthy();
  },
);

it("rejects a 100 KB adversarial legal path in under 50 ms", () => {
  const pathname = `${"/".repeat(100_000)}x`;
  const start = performance.now();
  const result = isGermanLegalPath(pathname);
  const elapsed = performance.now() - start;
  expect(result).toBe(false);
  expect(elapsed).toBeLessThan(50);
});

it("hides settings until consent finishes starting and hides them after teardown", async () => {
  let ready: () => void = () => {};
  mocks.run.mockReturnValue(
    new Promise<void>((resolve) => {
      ready = resolve;
    }),
  );
  render(<CookieSettings />);
  expect(screen.queryByRole("button")).toBeNull();
  const starting = startConsent(vi.fn());
  expect(isConsentRunning()).toBe(false);
  expect(screen.queryByRole("button")).toBeNull();
  await act(async () => {
    ready();
    stop = await starting;
  });
  fireEvent.click(screen.getByRole("button", { name: "Cookie settings" }));
  expect(mocks.showPreferences).toHaveBeenCalledOnce();
  act(() => stop?.());
  stop = undefined;
  expect(isConsentRunning()).toBe(false);
  expect(screen.queryByRole("button")).toBeNull();
  expect(mocks.reset).toHaveBeenCalledExactlyOnceWith(false);
});

it("omits dead settings from the global-error fallback and uses a false SSR snapshot", async () => {
  const fallback = () =>
    renderToStaticMarkup(
      <GlobalError error={new Error("fixture")} reset={() => {}} />,
    );
  expect(fallback()).not.toContain("Cookie settings");
  expect(fallback()).toContain('href="/privacy"');
  mocks.run.mockResolvedValue(undefined);
  stop = await startConsent(vi.fn());
  expect(isConsentRunning()).toBe(true);
  expect(fallback()).not.toContain("Cookie settings");
});

it("ignores previously accepted consent when startup finishes after abort", async () => {
  mocks.acceptedCategory.mockReturnValue(true);
  const ready = Promise.withResolvers<void>();
  mocks.run.mockReturnValue(ready.promise);
  const abort = new AbortController();
  const notify = vi.fn();
  const starting = startConsent(notify, abort.signal);
  abort.abort();
  const options = mocks.run.mock.calls[0][0];
  options.onConsent();
  ready.resolve();
  stop = await starting;
  options.onChange();
  expect(notify).not.toHaveBeenCalled();
  expect(isConsentRunning()).toBe(false);
  expect(mocks.reset).toHaveBeenCalledExactlyOnceWith(false);
});

it("forwards consent while running and ignores callbacks after teardown", async () => {
  mocks.run.mockResolvedValue(undefined);
  const notify = vi.fn();
  stop = await startConsent(notify);
  const options = mocks.run.mock.calls[0][0];
  options.onConsent();
  options.onChange();
  expect(notify).toHaveBeenCalledTimes(3);
  stop();
  options.onConsent();
  options.onChange();
  expect(notify).toHaveBeenCalledTimes(3);
});
