"use client";

import type { ReactNode } from "react";
import { UserRecordBootstrap } from "@/components/user-record-bootstrap";

export function AppProviders({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <UserRecordBootstrap />
      {children}
    </>
  );
}
