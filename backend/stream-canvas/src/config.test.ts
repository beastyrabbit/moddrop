import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("database pool reserves room for lock ownership and regular queries", () => {
  const run = (size: string) =>
    spawnSync(
      process.execPath,
      ["--input-type=module", "-e", 'await import("./src/config.ts")'],
      {
        cwd: new URL("..", import.meta.url),
        env: { NODE_ENV: "test", DATABASE_POOL_SIZE: size },
        encoding: "utf8",
        timeout: 2_000,
      },
    );
  const invalid = run("1");
  assert.equal(invalid.status, 1);
  assert.match(
    invalid.stderr,
    /DATABASE_POOL_SIZE must be an integer between 2 and 100/,
  );
  assert.equal(run("2").status, 0);
});
