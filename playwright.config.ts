import { defineConfig } from "@playwright/test";
import { legalWebServer } from "./e2e/legal.config";

export default defineConfig({
  testDir: "./e2e",
  projects: [
    { name: "canvas", testIgnore: "legal.spec.ts" },
    {
      name: "legal",
      testMatch: "legal.spec.ts",
      use: { baseURL: "http://127.0.0.1:4313" },
    },
  ],
  timeout: 45_000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4310",
    viewport: { width: 1280, height: 900 },
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "exec node e2e/server.ts",
      url: "http://127.0.0.1:4310",
      reuseExistingServer: false,
      timeout: 60_000,
      gracefulShutdown: { signal: "SIGTERM", timeout: 35_000 },
    },
    legalWebServer,
  ],
});
