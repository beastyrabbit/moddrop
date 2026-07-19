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
      // can't open, log it and send the visitor to Clerk's hosted sign-in
      // page — the app has no sign-in route of its own.
      console.error("[LandingAuthActions] openSignIn failed", error);
      void clerk.redirectToSignIn().catch((redirectError: unknown) => {
        console.error(
          "[LandingAuthActions] redirectToSignIn failed",
          redirectError,
        );
      });
    }
  };

  // "Get started" is a plain link and must not wait for clerk-js, which loads
  // late on slow networks and never with an ad blocker. Only the secondary
  // slot depends on auth state: keep its width reserved while Clerk resolves
  // so signed-out visitors get neither a CTA flash nor a layout shift.
  if (!isLoaded) {
    return (
      <div className={className} data-auth-loading>
        <span
          aria-hidden
          className={secondaryClassName}
          style={{ visibility: "hidden" }}
        >
          Log in
        </span>
        <Link href="/app" className={primaryClassName}>
          <span>Get started</span>
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>
    );
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
