"use client";

import { useAuth } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { beginAuth } from "@/lib/telemetry/events";

type LandingAuthActionsProps = {
  className?: string;
  secondaryClassName: string;
  primaryClassName: string;
};

export function LandingAuthActions({
  className,
  secondaryClassName,
  primaryClassName,
}: Readonly<LandingAuthActionsProps>) {
  const { isLoaded, isSignedIn } = useAuth();

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
      <Link
        href="/sign-in"
        onClick={() => beginAuth("sign_in")}
        className={secondaryClassName}
      >
        Log in
      </Link>
      <Link href="/app" className={primaryClassName}>
        <span>Get started</span>
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </div>
  );
}
