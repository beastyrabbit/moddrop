import * as Sentry from "@sentry/node";
import { errorConfig } from "./telemetry/config.ts";
import { scrubTelemetry } from "./telemetry/scrub.ts";

const config = errorConfig(process.env);
if (config.dsn) {
  Sentry.init({
    ...config,
    sendDefaultPii: false,
    sendClientReports: false,
    beforeSend: scrubTelemetry,
    beforeSendTransaction: scrubTelemetry,
    beforeBreadcrumb: scrubTelemetry,
    integrations: [
      Sentry.captureConsoleIntegration({ levels: ["error"] }),
      Sentry.onUnhandledRejectionIntegration({ mode: "strict" }),
    ],
  });
}
export const captureException = Sentry.captureException;
export const flushTelemetry = () => Sentry.flush(2_000);
