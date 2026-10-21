"use client";

import { useEffect } from "react";
import { LegalFooter } from "@/components/legal/legal-footer";
import { reportError } from "@/lib/telemetry/browser-errors";

export default function ErrorPage({
  error,
  reset,
}: Readonly<{
  error: Error;
  reset: () => void;
}>) {
  useEffect(() => {
    reportError(error);
  }, [error]);
  return (
    <div className="app-shell flex min-h-screen flex-col bg-background text-foreground">
      <main className="flex flex-1 flex-col items-center justify-center gap-5 px-5 py-16 text-center">
        <h1 className="text-3xl font-semibold">Something went wrong</h1>
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded border border-border px-5"
        >
          Try again
        </button>
        <a href="/" className="text-primary underline underline-offset-4">
          Back to Moddrop
        </a>
      </main>
      <LegalFooter />
    </div>
  );
}
