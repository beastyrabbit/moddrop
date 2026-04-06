"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";
import { UserRecordBootstrap } from "@/components/user-record-bootstrap";
import convex from "@/lib/convexClient";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <UserRecordBootstrap />
      {children}
    </ConvexProviderWithClerk>
  );
}
