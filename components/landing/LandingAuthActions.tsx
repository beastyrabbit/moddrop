"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { ArrowRight, Settings2 } from "lucide-react";
import Link from "next/link";

type LandingAuthActionsProps = {
  className?: string;
  secondaryClassName: string;
  primaryClassName: string;
  compact?: boolean;
};

export function LandingAuthActions({
  className,
  secondaryClassName,
  primaryClassName,
  compact = false,
}: LandingAuthActionsProps) {
  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useAuth();

  if (isLoaded && isSignedIn) {
    return (
      <div className={className}>
        <Link href="/app" className={secondaryClassName}>
          Open app
        </Link>
        <Link href="/app/settings" className={primaryClassName}>
          <Settings2 aria-hidden className="size-4" />
          {!compact && <span>Settings</span>}
        </Link>
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => clerk.openSignIn()}
        className={secondaryClassName}
      >
        Log in
      </button>
      <Link href="/app" className={primaryClassName}>
        {!compact && <span>Get started</span>}
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </div>
  );
}
