import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/app-shell";

const testState = vi.hoisted(() => ({
  pathname: "/app",
  isAuthenticated: true,
  isLoading: false,
  failIfAuthIsRead: false,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => testState.pathname,
}));

vi.mock("@clerk/nextjs", () => ({
  useClerk: () => {
    if (testState.failIfAuthIsRead) {
      throw new Error("Canvas routes must not read shell auth state");
    }
    return { openSignIn: vi.fn(), signOut: vi.fn() };
  },
  useUser: () => {
    if (testState.failIfAuthIsRead) {
      throw new Error("Canvas routes must not read shell user state");
    }
    return {
      user: {
        username: "greenroom_mod",
        firstName: "Green",
        primaryEmailAddress: { emailAddress: "mod@example.com" },
      },
    };
  },
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => {
    if (testState.failIfAuthIsRead) {
      throw new Error("Canvas routes must not read Convex auth state");
    }
    return {
      isAuthenticated: testState.isAuthenticated,
      isLoading: testState.isLoading,
    };
  },
}));

describe("AppShell", () => {
  beforeEach(() => {
    testState.pathname = "/app";
    testState.isAuthenticated = true;
    testState.isLoading = false;
    testState.failIfAuthIsRead = false;
  });

  it("renders both management routes and marks Rooms as current", () => {
    const html = renderShell();

    expect(html).toContain('aria-label="App navigation"');
    expect(html).toMatch(/<a aria-current="page"[^>]*href="\/app">Rooms<\/a>/);
    expect(html).toContain('href="/app/settings"');
    expect(html).toContain("Rooms");
    expect(html).toContain("Settings");
    expect(html).toContain("greenroom_mod");
    expect(html).toContain("Sign out");
    expect(html.match(/Sign out/g)).toHaveLength(1);
    expect(html).not.toContain(">Log in<");
  });

  it("marks Settings as current on the settings route", () => {
    testState.pathname = "/app/settings";
    const html = renderShell();

    expect(html).toMatch(
      /<a aria-current="page"[^>]*href="\/app\/settings">Settings<\/a>/,
    );
    expect(html).not.toMatch(
      /<a aria-current="page"[^>]*href="\/app">Rooms<\/a>/,
    );
  });

  it("shows one sign-in control when signed out", () => {
    testState.isAuthenticated = false;
    const html = renderShell();

    expect(html).toContain(">Log in<");
    expect(html).not.toContain("Sign out");
    expect(html).not.toContain("greenroom_mod");
  });

  it("bypasses all product chrome and auth hooks for canvas routes", () => {
    testState.pathname = "/app/rooms/room_123";
    testState.failIfAuthIsRead = true;

    const html = renderShell();

    expect(html).toBe('<div data-testid="page-content">Page content</div>');
    expect(html).not.toContain("app-shell");
    expect(html).not.toContain("App navigation");
    expect(html).not.toContain("Moddrop");
  });
});

function renderShell() {
  return renderToString(
    <AppShell>
      <div data-testid="page-content">Page content</div>
    </AppShell>,
  );
}
