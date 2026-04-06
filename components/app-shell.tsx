"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";
import { ArrowUpRight, LogIn, LogOut, Settings2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "Control Room" },
  { href: "/app/settings", label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const clerk = useClerk();
  const { user } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
    <div className="relative min-h-screen">
      <div className="signal-grid absolute inset-0 opacity-20" />
      <header className="sticky top-0 z-30 border-b border-white/6 bg-black/55 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold tracking-[0.14em] text-white/88 uppercase"
            >
              <span className="inline-flex size-5 items-center justify-center border border-[#33ff33] bg-[#33ff33] text-[0.7rem] font-black text-black">
                ▶
              </span>
              Moddrop
            </Link>
            <div className="hidden items-center gap-2 sm:flex">
              {navItems.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href === "/app" && pathname.startsWith("/app/rooms/"));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-xs font-medium tracking-[0.18em] uppercase",
                      active
                        ? "border-primary/30 bg-primary/12 text-primary"
                        : "border-white/8 bg-white/[0.03] text-white/58 hover:border-primary/18 hover:text-white/85",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLoading ? null : isAuthenticated ? (
              <>
                <span className="hidden text-xs text-white/45 sm:inline">
                  {user?.username ??
                    user?.firstName ??
                    user?.primaryEmailAddress?.emailAddress}
                </span>
                <Link
                  href="/app/settings"
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/8 px-3 py-1.5 text-xs text-white/72 hover:border-primary/18 hover:text-white"
                >
                  <Settings2 className="size-3.5" />
                  Settings
                </Link>
                <button
                  type="button"
                  onClick={() => clerk.signOut()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/8 px-3 py-1.5 text-xs text-white/72 hover:border-white/16 hover:text-white"
                >
                  <LogOut className="size-3.5" />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/obs"
                  className="hidden items-center gap-1.5 rounded-md border border-white/8 px-3 py-1.5 text-xs text-white/55 hover:border-white/16 hover:text-white sm:inline-flex"
                >
                  OBS mirror
                  <ArrowUpRight className="size-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => clerk.openSignIn()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-primary/24 bg-primary/12 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <LogIn className="size-3.5" />
                  Log in
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="relative z-10">{children}</main>
    </div>
  );
}
