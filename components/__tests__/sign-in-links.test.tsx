import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import Room from "@/app/app/rooms/[roomId]/page";
import Settings from "@/app/app/settings/page";

const state = vi.hoisted(() => ({ pathname: "/app/settings" }));
vi.mock("next/navigation", () => ({
  usePathname: () => state.pathname,
  useParams: () => ({ roomId: "room fixture" }),
}));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ isLoaded: true, isSignedIn: false }),
}));
vi.mock("@/components/stream-canvas/CanvasEditor", () => ({
  CanvasEditor: () => null,
}));
vi.mock("@/components/stream-canvas/UserMultiSelect", () => ({
  UserMultiSelect: () => null,
}));

it.each([
  [Settings, "/app/settings"],
  [Room, "/app/rooms/room%20fixture"],
])(
  "preserves the current relative path in the sign-in link",
  (Page, pathname) => {
    state.pathname = pathname;
    const html = renderToStaticMarkup(<Page />);
    const href = html.match(/href="([^"]+)"/)?.[1];
    expect(href).toBe(`/sign-in?redirect_url=${encodeURIComponent(pathname)}`);
    const target = new URL(href ?? "", "https://moddrop.live");
    const destination = new URL(
      target.searchParams.get("redirect_url") ?? "",
      target,
    );
    expect(destination.origin).toBe(target.origin);
    expect(destination.pathname).toBe(pathname);
  },
);
