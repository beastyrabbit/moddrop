import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Landing } from "@/components/landing/Landing";
import { LandingAuthActions } from "@/components/landing/LandingAuthActions";

const authState = vi.hoisted(() => ({ isLoaded: true, isSignedIn: false }));

vi.mock("next/font/google", () => ({
  DM_Sans: () => ({ variable: "--font-dm-sans" }),
  DM_Serif_Display: () => ({ variable: "--font-dm-serif" }),
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => authState,
  useClerk: () => ({ openSignIn: vi.fn(), redirectToSignIn: vi.fn() }),
}));

function renderAuthActions() {
  return renderToString(
    <LandingAuthActions
      secondaryClassName="secondary"
      primaryClassName="primary"
    />,
  );
}

describe("Landing", () => {
  it("renders the hero, primary CTA, and footer", () => {
    authState.isLoaded = true;
    authState.isSignedIn = false;
    const html = renderToString(<Landing />);

    expect(html).toContain("You stay in the");
    expect(html).toContain("spotlight");
    expect(html).toContain('href="/app"');
    expect(html).toContain(String(new Date().getFullYear()));
  });

  it("exposes the shared-canvas demo to assistive tech", () => {
    authState.isLoaded = true;
    authState.isSignedIn = false;
    const html = renderToString(<Landing />);

    expect(html).toContain("<fieldset");
    expect(html).toContain("Interactive shared canvas preview");
    expect(html).toContain('aria-label="Stream drop zone"');
    expect(html).toContain("Drag it or use the arrow keys");
    expect(html).toContain("visual only");
    expect(html).not.toContain("<audio");
  });
});

describe("LandingAuthActions", () => {
  it("keeps the Get started link visible while Clerk loads", () => {
    authState.isLoaded = false;
    authState.isSignedIn = false;
    const html = renderAuthActions();

    expect(html).toContain("Get started");
    expect(html).toContain('href="/app"');
    expect(html).not.toContain("Open app");
  });

  it("shows Log in and Get started when signed out", () => {
    authState.isLoaded = true;
    authState.isSignedIn = false;
    const html = renderAuthActions();

    expect(html).toContain("Log in");
    expect(html).toContain("Get started");
  });

  it("shows Settings and Open app when signed in", () => {
    authState.isLoaded = true;
    authState.isSignedIn = true;
    const html = renderAuthActions();

    expect(html).toContain("Settings");
    expect(html).toContain("Open app");
    expect(html).not.toContain("Get started");
  });
});
