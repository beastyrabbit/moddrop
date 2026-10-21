"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { useEffect, useMemo, useRef } from "react";
import {
  createAnalytics,
  disableAnalytics,
  isOverlay,
} from "@/lib/telemetry/analytics";
import { startErrorReporting } from "@/lib/telemetry/browser-errors";
import type { TelemetryConfig } from "@/lib/telemetry/config";
import { startConsent, syncConsentLanguage } from "@/lib/telemetry/consent";
import {
  beginAuth,
  completeAuth,
  outboundHost,
  track,
  vitalEvent,
} from "@/lib/telemetry/events";

const reportVital: Parameters<typeof useReportWebVitals>[0] = (metric) =>
  track("web_vital", vitalEvent(metric));

export function Telemetry({ config }: Readonly<{ config: TelemetryConfig }>) {
  const { dsn, environment, release, tracesSampleRate } = config.errors;
  const { host, website, domains } = config.umami ?? {};
  const stableConfig = useMemo(
    () => ({
      errors: { dsn, environment, release, tracesSampleRate },
      umami:
        host && website && domains ? { host, website, domains } : undefined,
    }),
    [dsn, environment, release, tracesSampleRate, host, website, domains],
  );
  const pathname = usePathname();
  const overlay = isOverlay(pathname);
  const analytics = useRef<ReturnType<typeof createAnalytics> | undefined>(
    undefined,
  );
  const { isSignedIn } = useAuth();
  const clerk = useClerk();
  const observedSignUp = useRef<string | undefined>(undefined);
  useReportWebVitals(reportVital);
  useEffect(() => startErrorReporting(stableConfig.errors), [stableConfig]);
  useEffect(() => {
    if (overlay) {
      analytics.current?.dispose(true);
      analytics.current = undefined;
      return;
    }
    if (!stableConfig.umami) {
      disableAnalytics();
      analytics.current = undefined;
      return;
    }
    let disposed = false;
    const consentAbort = new AbortController();
    let cleanup: (() => void) | undefined;
    const instance = createAnalytics(stableConfig.umami);
    analytics.current = instance;
    void startConsent((accepted) => {
      if (!disposed) instance.setConsent(accepted);
    }, consentAbort.signal).then((stop) => {
      if (disposed) stop();
      else cleanup = stop;
    });
    const onClick = (event: MouseEvent) => {
      const host = outboundHost(event.target, window.location.origin);
      if (host) track("outbound_link", { host });
    };
    document.addEventListener("click", onClick);
    return () => {
      disposed = true;
      consentAbort.abort();
      cleanup?.();
      instance.dispose();
      document.removeEventListener("click", onClick);
    };
    // The root persists across App Router navigation. Only OBS changes lifecycle.
  }, [stableConfig, overlay]);
  useEffect(() => {
    if (stableConfig.umami && !overlay) syncConsentLanguage();
    if (pathname) analytics.current?.pageview();
  }, [pathname, stableConfig, overlay]);
  useEffect(
    () =>
      clerk.addListener(({ client }) => {
        if (
          client?.signUp.id &&
          client.signUp.id !== observedSignUp.current &&
          client.signUp.status !== "complete" &&
          !isSignedIn
        ) {
          observedSignUp.current = client.signUp.id;
          beginAuth("sign_up");
        }
        if (
          client?.signIn.status === "complete" ||
          client?.signUp.status === "complete"
        )
          completeAuth();
      }),
    [clerk, isSignedIn],
  );
  useEffect(() => {
    if (isSignedIn) completeAuth();
  }, [isSignedIn]);
  return null;
}
