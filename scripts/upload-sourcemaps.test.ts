import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";

// Execute the actual script in a child with fake secret and CLI adapters. The
// CLI never runs, so no credentials or source artifacts can reach a network.
const fixture = `
import fs from "node:fs";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { pathToFileURL } from "node:url";
const readFile = fs.readFileSync;
fs.readFileSync = (path, ...args) => {
  if (path !== "/run/secrets/glitchtip_auth_token") return readFile(path, ...args);
  if (process.env.FIXTURE_TOKEN === "missing") {
    const error = new Error("Fixture secret absent");
    error.code = "ENOENT";
    throw error;
  }
  return process.env.FIXTURE_TOKEN === "present" ? "synthetic-fixture-value" : "  ";
};
childProcess.spawnSync = (_command, args, options) => {
  if (options.env.SENTRY_AUTH_TOKEN !== "synthetic-fixture-value") throw new Error("Missing fixture value");
  console.log("Fake CLI: " + args.slice(1, 3).join(" "));
  return { status: Number(process.env.FIXTURE_CLI_STATUS) };
};
syncBuiltinESMExports();
await import(pathToFileURL(process.env.FIXTURE_SCRIPT).href);
`;

it.each([
  {
    required: "1",
    token: "missing",
    cli: "0",
    exit: 1,
    message: "GLITCHTIP_AUTH_TOKEN BuildKit secret is missing or empty",
  },
  {
    required: "1",
    token: "empty",
    cli: "0",
    exit: 1,
    message: "GLITCHTIP_AUTH_TOKEN BuildKit secret is missing or empty",
  },
  {
    required: "",
    token: "missing",
    cli: "0",
    exit: 0,
    message: "skipping source-map upload",
  },
  {
    required: "",
    token: "empty",
    cli: "0",
    exit: 0,
    message: "skipping source-map upload",
  },
  {
    required: "1",
    token: "present",
    cli: "0",
    exit: 0,
    message: "Browser source maps uploaded for this release",
  },
  {
    required: "1",
    token: "present",
    cli: "17",
    exit: 17,
    message: "sourcemaps inject failed (exit status 17)",
  },
])(
  "required=$required token=$token CLI=$cli → exit $exit",
  ({ required, token, cli, exit, message }) => {
    const directory = mkdtempSync(join(tmpdir(), "moddrop-upload-maps-"));
    try {
      mkdirSync(join(directory, ".next/static"), { recursive: true });
      const map = join(directory, ".next/static/client.js.map");
      writeFileSync(map, "{}");
      const result = spawnSync(
        process.execPath,
        ["--input-type=module", "-e", fixture],
        {
          cwd: directory,
          encoding: "utf8",
          env: {
            NODE_ENV: "test",
            PATH: process.env.PATH,
            APP_RELEASE: "moddrop@fixture",
            SOURCEMAP_UPLOAD_REQUIRED: required,
            FIXTURE_TOKEN: token,
            FIXTURE_CLI_STATUS: cli,
            FIXTURE_SCRIPT: resolve("scripts/upload-sourcemaps.mjs"),
          },
          timeout: 5_000,
        },
      );
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(exit);
      expect(result.stdout + result.stderr).toContain(message);
      expect(result.stdout + result.stderr).not.toContain(
        "synthetic-fixture-value",
      );
      expect(existsSync(map)).toBe(false);
      if (token === "present")
        expect(result.stdout).toContain("Fake CLI: sourcemaps inject");
      else expect(result.stdout).not.toContain("Fake CLI");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
