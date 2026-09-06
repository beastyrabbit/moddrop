import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { parse } from "yaml";

test.each([false, true])(
  "alternate database %s controls only its own lifecycle",
  (alternate) => {
    const directory = mkdtempSync(join(tmpdir(), "moddrop-dev-test-"));
    try {
      mkdirSync(join(directory, "scripts"));
      mkdirSync(join(directory, "bin"));
      writeFileSync(
        join(directory, "scripts/dev.ts"),
        readFileSync("scripts/dev.ts"),
      );
      for (const command of ["docker", "pnpm"]) {
        writeFileSync(
          join(directory, "bin", command),
          '#!/bin/sh\nprintf "%s\\n" "$0 $*" >> "$DEV_TEST_LOG"\n',
          { mode: 0o755 },
        );
      }
      const log = join(directory, "commands");
      execFileSync(process.execPath, [join(directory, "scripts/dev.ts")], {
        env: {
          NODE_ENV: "test",
          PATH: `${join(directory, "bin")}:${process.env.PATH}`,
          DEV_TEST_LOG: log,
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_fixture",
          CLERK_SECRET_KEY: ["sk", "test", "fixture"].join("_"),
          CLERK_JWT_ISSUER_DOMAIN: "https://fixture.invalid",
          ...(alternate
            ? { MODDROP_DEV_DATABASE_URL: "postgresql://fixture.invalid/test" }
            : {}),
        },
        stdio: "pipe",
      });
      const commands = readFileSync(log, "utf8");
      expect(commands.includes("docker")).toBe(!alternate);
      expect(commands).toContain("db:migrate");
      expect(commands).toContain("dev:apps");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);

test("development database is bound only to loopback", () => {
  const compose = parse(readFileSync("compose.dev.yml", "utf8"));
  expect(compose.services.postgres.ports).toEqual(["127.0.0.1:5432:5432"]);
});
