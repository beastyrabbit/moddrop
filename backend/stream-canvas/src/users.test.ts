import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("PostgreSQL username search treats LIKE wildcards literally", {
  skip:
    !process.env.CANVAS_TEST_DATABASE_URL &&
    "Requires an isolated PostgreSQL database",
  timeout: 30_000,
}, async () => {
  // A private schema keeps this file from racing other files' migrations.
  const schemaName = `users_test_${randomBytes(4).toString("hex")}`;
  const databaseUrl = new URL(process.env.CANVAS_TEST_DATABASE_URL ?? "");
  databaseUrl.searchParams.set("options", `-c search_path=${schemaName}`);
  Object.assign(process.env, {
    NODE_ENV: "test",
    DATABASE_URL: databaseUrl.toString(),
  });
  const [{ pool }, { searchUsers }] = await Promise.all([
    import("./db.ts"),
    import("./users.ts"),
  ]);
  try {
    await pool.query(`CREATE SCHEMA ${schemaName}`);
    const migration = await readFile(
      new URL("../drizzle/0001_users.sql", import.meta.url),
      "utf8",
    );
    for (const statement of migration.split("--> statement-breakpoint")) {
      await pool.query(statement);
    }
    await pool.query(
      `INSERT INTO users (clerk_user_id, username, username_search)
       VALUES ('user_literal', 'a_b', 'a_b'), ('user_wildcard', 'axb', 'axb')`,
    );

    assert.deepEqual(
      (await searchUsers("a_")).map((user) => user.username),
      ["a_b"],
    );
    assert.equal((await searchUsers("A")).length, 2);
    assert.deepEqual(await searchUsers("a%"), []);
  } finally {
    await pool.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
    await pool.end();
  }
});
