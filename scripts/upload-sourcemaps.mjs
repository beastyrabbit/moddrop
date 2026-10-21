import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { assertNoRuntimePlaceholders } from "./sourcemap-guard.ts";

const secret = "/run/secrets/glitchtip_auth_token";
function removeMaps(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) removeMaps(path);
    else if (entry.name.endsWith(".map")) rmSync(path);
  }
}
let step = "read BuildKit secret";
try {
  let token;
  try {
    token = readFileSync(secret, "utf8").trim();
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (process.env.SOURCEMAP_UPLOAD_REQUIRED === "1" && !token) {
    step =
      "required source-map upload: GLITCHTIP_AUTH_TOKEN BuildKit secret is missing or empty";
    throw new Error("Required source-map upload has no token");
  }
  if (token) {
    step = "validate browser artifacts contain no runtime placeholders";
    assertNoRuntimePlaceholders(".next/static");
    step = "validate APP_RELEASE";
    if (!process.env.APP_RELEASE)
      throw new Error("APP_RELEASE is required for source-map uploads");
    // BuildKit secret enters only this child environment. Never print CLI output:
    // server failures can echo request credentials or uploaded source content.
    const env = {
      ...process.env,
      SENTRY_AUTH_TOKEN: token,
      SENTRY_URL: process.env.SENTRY_URL || "https://glitchtip.heerlab.com",
      SENTRY_ORG: "beasty-rabbit",
      SENTRY_PROJECT: "moddrop",
      SENTRY_LOG_LEVEL: "error",
    };
    for (const args of [
      ["sourcemaps", "inject", ".next/static"],
      [
        "sourcemaps",
        "upload",
        "--release",
        process.env.APP_RELEASE,
        ".next/static",
      ],
    ]) {
      step = args.slice(0, 2).join(" ");
      const cli = createRequire(import.meta.url).resolve(
        "@sentry/cli/bin/sentry-cli",
      );
      const result = spawnSync(process.execPath, [cli, ...args], {
        env,
        stdio: "ignore",
      });
      if (result.status !== 0) {
        process.exitCode = result.status ?? 1;
        throw new Error("Source-map CLI failed");
      }
    }
    console.log("Browser source maps uploaded for this release");
  } else
    console.log("No BuildKit GlitchTip secret; skipping source-map upload");
} catch {
  process.exitCode ||= 1;
  console.error(`${step} failed (exit status ${process.exitCode})`);
} finally {
  try {
    removeMaps(".next");
  } catch {
    process.exitCode ||= 1;
    console.error(
      `remove source maps failed (exit status ${process.exitCode})`,
    );
  }
}
