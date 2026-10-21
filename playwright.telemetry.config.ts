import { defineConfig } from "@playwright/test";

const port = process.env.MODDROP_TELEMETRY_TEST_PORT ?? "43920";
const origin = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "./e2e/telemetry",
  testMatch: "*.spec.ts",
  workers: 1,
  timeout: 30_000,
  use: {
    baseURL: origin,
    // A real browser UA exercises the normal production path. The app has no
    // test bypass for its bot or hostname checks.
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node e2e/telemetry/server.ts",
    url: `${origin}/privacy`,
    env: { MODDROP_TELEMETRY_TEST_PORT: port },
    timeout: 60_000,
    reuseExistingServer: false,
    gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
  },
});
