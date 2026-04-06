"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";
import { UserRecordBootstrap } from "@/components/user-record-bootstrap";
import convex from "@/lib/convexClient";

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  throw new Error(
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must be defined. Add it to .env.local or your deployment environment.",
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <UserRecordBootstrap />
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
