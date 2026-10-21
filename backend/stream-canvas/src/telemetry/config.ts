export function errorConfig(env: Record<string, string | undefined>) {
  let dsn: string | undefined;
  try {
    const url = new URL(env.GLITCHTIP_DSN ?? "");
    if (
      ["https:", "http:"].includes(url.protocol) &&
      url.username &&
      !url.password &&
      /\/\d+$/.test(url.pathname)
    )
      dsn = url.href;
  } catch {
    /* Unset or invalid configuration disables reporting. */
  }
  const sample = Number(env.GLITCHTIP_TRACES_SAMPLE_RATE ?? "0.05");
  return {
    dsn,
    environment: env.GLITCHTIP_ENVIRONMENT || "production",
    release: env.APP_RELEASE || undefined,
    tracesSampleRate:
      Number.isFinite(sample) && sample >= 0 && sample <= 1 ? sample : 0.05,
  };
}
