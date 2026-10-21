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
  run: vi.fn<() => Promise<void>>(),
  reset: vi.fn(),
  showPreferences: vi.fn(),
  pathname: "/privacy",
}));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));
vi.mock("vanilla-cookieconsent", () => ({
  run: mocks.run,
  reset: mocks.reset,
  showPreferences: mocks.showPreferences,
  acceptedCategory: () => false,
}));
let stop: (() => void) | undefined;
afterEach(() => {
  act(() => stop?.());
  stop = undefined;
  cleanup();
  vi.clearAllMocks();
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
