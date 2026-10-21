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
import { isConsentRunning, startConsent } from "@/lib/telemetry/consent";
import { CookieSettings } from "../cookie-settings";

const mocks = vi.hoisted(() => ({
  run: vi.fn<() => Promise<void>>(),
  reset: vi.fn(),
  showPreferences: vi.fn(),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/privacy" }));
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
