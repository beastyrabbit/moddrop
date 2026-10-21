import { defineConfig } from "@playwright/test";

// Separate from the canvas Vite/PostgreSQL fixture: exercise real App Router
// responses from the already-built Next application, without live Clerk.
export const legalWebServer = {
  command: "exec node e2e/legal-server.ts",
  cwd: process.cwd(),
  url: "http://127.0.0.1:4313",
  reuseExistingServer: false,
  gracefulShutdown: { signal: "SIGTERM" as const, timeout: 10_000 },
  env: {
    NEXT_TELEMETRY_DISABLED: "1",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_Y2xlcmsuZXhhbXBsZS50ZXN0JA",
    NEXT_PUBLIC_CANVAS_API_URL: "http://127.0.0.1:4313/canvas-api",
  },
};

export default defineConfig({
  testDir: ".",
  testMatch: "legal.spec.ts",
  workers: 1,
  timeout: 30_000,
  use: { baseURL: "http://127.0.0.1:4313", screenshot: "only-on-failure" },
  webServer: legalWebServer,
});
