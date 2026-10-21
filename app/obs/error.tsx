"use client";

import { useEffect } from "react";
import { reportBoundaryError } from "@/lib/telemetry/browser-errors";

export default function OBSError({
  error,
  reset,
}: Readonly<{
  error: Error;
  reset: () => void;
}>) {
  useEffect(() => {
    reportBoundaryError(error);
  }, [error]);
  return (
    <div
      role="alert"
      className="flex h-screen items-center justify-center gap-4 text-sm text-white/60"
    >
      <p>OBS output unavailable.</p>
      <button type="button" onClick={reset} className="underline">
        Try again
      </button>
    </div>
  );
}
