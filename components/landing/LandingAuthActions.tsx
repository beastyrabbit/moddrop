"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

type LandingAuthActionsProps = {
  className?: string;
  secondaryClassName: string;
  primaryClassName: string;
};

export function LandingAuthActions({
  className,
  secondaryClassName,
  primaryClassName,
}: LandingAuthActionsProps) {
  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useAuth();

  const handleSignIn = () => {
    if (!isLoaded) return;
    try {
      clerk.openSignIn();
    } catch (error) {
      // Never leave the primary auth control as a silent no-op: if the modal
      // can't open, log it and fall back to the sign-in route.
      console.error("[LandingAuthActions] openSignIn failed", error);
      window.location.href = "/app";
    }
  };

  // Reserve the row until Clerk resolves so signed-in visitors aren't flashed
  // the signed-out CTAs and the pre-load click window is closed.
  if (!isLoaded) {
    return <div className={className} aria-hidden data-auth-loading />;
  }

  if (isSignedIn) {
    return (
      <div className={className}>
        <Link href="/app/settings" className={secondaryClassName}>
          Settings
        </Link>
        <Link href="/app" className={primaryClassName}>
          <span>Open app</span>
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleSignIn}
        className={secondaryClassName}
      >
        Log in
      </button>
      <Link href="/app" className={primaryClassName}>
        <span>Get started</span>
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </div>
  );
}
