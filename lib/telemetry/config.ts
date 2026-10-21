import { errorConfig } from "@/backend/stream-canvas/src/telemetry/config";

export function telemetryConfig(env: Record<string, string | undefined>) {
  let umami: { host: string; website: string; domains: string } | undefined;
  try {
    const url = new URL(env.UMAMI_HOST_URL ?? "");
    if (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      env.UMAMI_WEBSITE_ID &&
      env.UMAMI_DOMAINS
    ) {
      umami = {
        host: url.origin,
        website: env.UMAMI_WEBSITE_ID,
        domains: env.UMAMI_DOMAINS,
      };
    }
  } catch {
    /* Analytics requires all three settings. */
  }
  return { umami, errors: errorConfig(env) };
}
export type TelemetryConfig = ReturnType<typeof telemetryConfig>;
