import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.GLITCHTIP_DSN) {
    const Sentry = await import("@sentry/node");
    const { errorConfig } = await import(
      "./backend/stream-canvas/src/telemetry/config"
    );
    const { scrubTelemetry } = await import(
      "./backend/stream-canvas/src/telemetry/scrub"
    );
    const config = errorConfig(process.env);
    if (!config.dsn) return;
    Sentry.init({
      ...config,
      sendDefaultPii: false,
      sendClientReports: false,
      beforeSend: scrubTelemetry,
      beforeSendTransaction: scrubTelemetry,
      beforeBreadcrumb: scrubTelemetry,
      integrations: [Sentry.captureConsoleIntegration({ levels: ["error"] })],
    });
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  _request,
  context,
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.GLITCHTIP_DSN)
    return;
  const Sentry = await import("@sentry/node");
  Sentry.captureException(error, {
    tags: { router: context.routerKind, route: context.routePath },
  });
  await Sentry.flush(2_000);
};
