import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";

test("maintenance migration waits beyond service deadlines for its advisory lock", {
  skip:
    !process.env.CANVAS_TEST_DATABASE_URL &&
    "Requires an isolated PostgreSQL database",
  timeout: 30_000,
}, async () => {
  process.env.DATABASE_URL = process.env.CANVAS_TEST_DATABASE_URL;
  const { pool } = await import("./maintenance-db.ts");
  const client = await pool.connect();
  const lockKey = 1_296_315_461;
  let migration: Promise<unknown> | undefined;
  try {
    const timeout = await client.query("SHOW statement_timeout");
    assert.equal(timeout.rows[0]?.statement_timeout, "0");
    await client.query("SELECT pg_advisory_lock($1)", [lockKey]);
    let completed = false;
    migration = promisify(execFile)(process.execPath, ["src/migrate.ts"], {
      env: {
        ...process.env,
        DATABASE_URL: process.env.CANVAS_TEST_DATABASE_URL,
      },
    }).finally(() => {
      completed = true;
    });
    // Attach immediately so a regression fails assertions without an unhandled rejection.
    void migration.catch(() => {});
    await delay(12_500);
    assert.equal(
      completed,
      false,
      "migration must keep waiting beyond both service limits",
    );
    await client.query("SELECT pg_advisory_unlock($1)", [lockKey]);
    await migration;
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [lockKey]);
    client.release();
    await migration?.catch(() => {});
    await pool.end();
  }
});
