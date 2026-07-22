import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { closeDatabase, db, pool } from "./db.ts";

const MIGRATION_LOCK_KEY = 1_296_315_461;
const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));

const client = await pool.connect();

try {
  await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
  await migrate(db, { migrationsFolder });
  console.log("[database] migrations complete");
} finally {
  try {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]);
  } finally {
    client.release();
    await closeDatabase();
  }
}
