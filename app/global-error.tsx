"use client";

import { useEffect } from "react";
import { LegalFooter } from "@/components/legal/legal-footer";
import {
  reportError,
  startErrorReporting,
} from "@/lib/telemetry/browser-errors";
import type { TelemetryConfig } from "@/lib/telemetry/config";

export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error;
  reset: () => void;
}>) {
  useEffect(() => {
    reportError(error);
  }, [error]);
  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    void fetch("/telemetry-config", { credentials: "omit" })
      .then((response) => response.json())
      .then((config: TelemetryConfig["errors"]) => {
        if (!cancelled) stop = startErrorReporting(config);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);
  return (
    <html lang="en">
      <body>
        <main>
          <h1>Something went wrong</h1>
          <button type="button" onClick={reset}>
            Try again
          </button>
        </main>
        <LegalFooter />
      </body>
    </html>
  );
}
