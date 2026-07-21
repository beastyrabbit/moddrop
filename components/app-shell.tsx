"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";
import { LogIn, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModdropLogo } from "@/components/common/ModdropLogo";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "Rooms" },
  { href: "/app/settings", label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/app/rooms/")) {
    return children;
  }

  return <ThemedAppShell pathname={pathname}>{children}</ThemedAppShell>;
}

function ThemedAppShell({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
  const clerk = useClerk();
  const { user } = useUser();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const displayName =
    user?.username ??
    user?.firstName ??
    user?.primaryEmailAddress?.emailAddress;

  return (
    <div className="app-shell min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 px-4 sm:flex-nowrap sm:px-6">
          <ModdropLogo className="app-shell-logo shrink-0" priority />

          <nav
            aria-label="App navigation"
            className="order-3 flex h-11 w-full items-stretch gap-6 sm:order-none sm:h-16 sm:w-auto sm:self-stretch"
          >
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative inline-flex min-h-11 items-center border-b-2 px-0.5 text-sm font-semibold",
                    active
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex min-h-14 min-w-0 items-center justify-end gap-2 sm:min-h-16">
            {isLoading ? (
              <span
                className="h-5 w-20 animate-pulse rounded bg-secondary"
                role="status"
              >
                <span className="sr-only">Loading account</span>
              </span>
            ) : isAuthenticated ? (
              <>
                {displayName ? (
                  <span className="hidden max-w-44 truncate text-sm text-muted-foreground md:block">
                    {displayName}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => clerk.signOut()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-foreground hover:border-primary/60 hover:bg-secondary"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  Sign out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => clerk.openSignIn()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-3 text-sm font-semibold text-primary-foreground hover:border-[var(--app-brass-highlight)] hover:bg-[var(--app-brass-highlight)]"
              >
                <LogIn className="size-4" aria-hidden="true" />
                Log in
              </button>
            )}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
