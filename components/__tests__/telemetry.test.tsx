// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { telemetryConfig } from "@/lib/telemetry/config";
import { Telemetry } from "../telemetry";

const mocks = vi.hoisted(() => ({
  startConsent: vi.fn(),
  syncConsentLanguage: vi.fn(),
  startErrorReporting: vi.fn(),
  createAnalytics: vi.fn(),
  stopConsent: vi.fn(),
  dispose: vi.fn(),
  clerk: { addListener: () => () => {} },
}));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isSignedIn: false }),
  useClerk: () => mocks.clerk,
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/privacy" }));
vi.mock("next/web-vitals", () => ({ useReportWebVitals: vi.fn() }));
vi.mock("@/lib/telemetry/consent", () => ({
  startConsent: mocks.startConsent,
  syncConsentLanguage: mocks.syncConsentLanguage,
}));
vi.mock("@/lib/telemetry/browser-errors", () => ({
  startErrorReporting: mocks.startErrorReporting,
}));
vi.mock("@/lib/telemetry/analytics", () => ({
  createAnalytics: mocks.createAnalytics,
  isOverlay: () => false,
}));

const env = {
  UMAMI_HOST_URL: "https://analytics.invalid",
  UMAMI_WEBSITE_ID: "fixture",
  UMAMI_DOMAINS: "localhost",
  GLITCHTIP_DSN: "https://public@errors.invalid/10",
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.startConsent.mockResolvedValue(mocks.stopConsent);
  mocks.createAnalytics.mockReturnValue({
    setConsent: vi.fn(),
    pageview: vi.fn(),
    dispose: mocks.dispose,
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it.each(["UMAMI_HOST_URL", "UMAMI_WEBSITE_ID", "UMAMI_DOMAINS"])(
  "does not start consent or analytics without %s, but keeps error reporting",
  (missing) => {
    const config = telemetryConfig({ ...env, [missing]: undefined });
    const addListener = vi.spyOn(document, "addEventListener");
    render(<Telemetry config={config} />);
    expect(mocks.startConsent).not.toHaveBeenCalled();
    expect(mocks.syncConsentLanguage).not.toHaveBeenCalled();
    expect(mocks.createAnalytics).not.toHaveBeenCalled();
    expect(addListener).not.toHaveBeenCalledWith("click", expect.any(Function));
    expect(mocks.startErrorReporting).toHaveBeenCalledWith(config.errors);
  },
);

it("does not start consent when all telemetry settings are absent", () => {
  render(<Telemetry config={telemetryConfig({})} />);
  expect(mocks.startConsent).not.toHaveBeenCalled();
  expect(mocks.createAnalytics).not.toHaveBeenCalled();
});

it("starts and tears down consent and analytics when Umami is configured", async () => {
  const { unmount } = render(<Telemetry config={telemetryConfig(env)} />);
  await act(async () => {});
  expect(mocks.startConsent).toHaveBeenCalledOnce();
  expect(mocks.createAnalytics).toHaveBeenCalledOnce();
  unmount();
  expect(mocks.stopConsent).toHaveBeenCalledOnce();
  expect(mocks.dispose).toHaveBeenCalledOnce();
});
