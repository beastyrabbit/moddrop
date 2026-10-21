import type { TelemetryConfig } from "./config";

/** An error whose error report and failure event have already been emitted. */
export class ReportedError extends Error {}

function containsReportedError(args: unknown) {
  return (
    Array.isArray(args) && args.some((arg) => arg instanceof ReportedError)
  );
}

type Reporter = (error: unknown) => void;
let report: Reporter | undefined;
const pending: unknown[] = [];
let stopBuffer: (() => void) | undefined;
export function bufferEarlyErrors() {
  if (stopBuffer) return;
  const onError = (event: ErrorEvent) =>
    reportError(event.error ?? new Error(event.message));
  const onRejection = (event: PromiseRejectionEvent) =>
    reportError(event.reason);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  stopBuffer = () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    stopBuffer = undefined;
  };
}
export function reportError(error: unknown) {
  if (error instanceof ReportedError) return;
  if (report) report(error);
  else if (pending.length < 20) pending.push(error);
}

export function startErrorReporting(config: TelemetryConfig["errors"]) {
  if (!config.dsn) {
    stopBuffer?.();
    pending.length = 0;
    return () => {};
  }
  bufferEarlyErrors();
  let cancelled = false;
  // A separate import keeps the SDK out of the initial route chunks.
  const timer = window.setTimeout(async () => {
    try {
      const [Sentry, { scrubTelemetry }] = await Promise.all([
        import("@sentry/browser"),
        import("@/backend/stream-canvas/src/telemetry/scrub"),
      ]);
      if (cancelled) return;
      Sentry.init({
        ...config,
        sendDefaultPii: false,
        sendClientReports: false,
        // No session/replay, tracing, persistent transport, or device identity integrations.
        integrations: (defaults) => [
          ...defaults.filter(
            (item) =>
              ![
                "BrowserSession",
                "BrowserSessionIntegration",
                "Breadcrumbs",
              ].includes(item.name),
          ),
          Sentry.breadcrumbsIntegration({ dom: false, console: false }),
          Sentry.captureConsoleIntegration({ levels: ["error"] }),
        ],
        beforeSend: (event, hint) => {
          const context = hint.captureContext;
          // Sentry normalizes event.extra before beforeSend; captureContext
          // retains the original console arguments, including Error instances.
          const args =
            context && typeof context === "object" && "extra" in context
              ? context.extra?.arguments
              : undefined;
          if (
            hint.originalException instanceof ReportedError ||
            containsReportedError(event.extra?.arguments) ||
            containsReportedError(args)
          ) {
            return null;
          }
          return scrubTelemetry(event);
        },
        beforeSendTransaction: scrubTelemetry,
        beforeBreadcrumb: scrubTelemetry,
      });
      stopBuffer?.();
      report = (error) => {
        Sentry.captureException(error);
      };
      for (const error of pending.splice(0)) report(error);
    } catch {
      /* Error reporting must not break the application. */
    }
  }, 0);
  return () => {
    cancelled = true;
    clearTimeout(timer);
    stopBuffer?.();
  };
}
