import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  test: {
    env: { NEXT_PUBLIC_CANVAS_API_URL: "https://canvas-test.invalid" },
    exclude: [
      "**/node_modules/**",
      "**/backend/**",
      "**/.next/**",
      "**/e2e/**",
    ],
  },
});
