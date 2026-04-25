"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { ArrowRight, Settings2 } from "lucide-react";
import Link from "next/link";

export function LandingNavActions() {
  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useAuth();

  const handleSignIn = () => {
    if (isSignedIn) return;
    clerk.openSignIn();
  };

  if (isLoaded && isSignedIn) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/app"
          className="hidden whitespace-nowrap rounded-[8px] border border-white/12 px-4 py-2 text-sm font-semibold text-white/76 hover:border-primary/40 hover:text-white sm:inline-flex"
        >
          Open app
        </Link>
        <Link
          href="/app/settings"
          className="inline-flex items-center gap-2 whitespace-nowrap rounded-[8px] border border-primary/30 bg-primary px-3 py-2.5 text-sm font-black text-primary-foreground shadow-[0_0_28px_rgba(51,255,51,0.18)] hover:bg-[#66ff55] sm:px-4 sm:py-2"
        >
          <Settings2 className="size-4" />
          <span className="hidden sm:inline">Settings</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={handleSignIn}
        className="hidden whitespace-nowrap rounded-[8px] px-4 py-2 text-sm font-semibold text-white/76 hover:text-white sm:inline-flex"
      >
        Log in
      </button>
      <Link
        href="/app"
        className="inline-flex items-center gap-2 whitespace-nowrap rounded-[8px] border border-primary/30 bg-primary px-3 py-2.5 text-sm font-black text-primary-foreground shadow-[0_0_28px_rgba(51,255,51,0.18)] hover:bg-[#66ff55] sm:px-4 sm:py-2"
      >
        Get started
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
