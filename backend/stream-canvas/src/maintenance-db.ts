import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "./config.ts";
import * as schema from "./schema.ts";

// Offline migration/import work can wait for locks and run long DDL/backfills.
// Keep it separate from the service pool's request and shutdown deadlines.
export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: config.databasePoolSize,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 0,
  query_timeout: 0,
  application_name: "moddrop-stream-canvas-maintenance",
});
pool.on("error", (error) => {
  console.error("[maintenance] idle PostgreSQL connection failed", error);
});
export const db = drizzle(pool, { schema });
export async function closeDatabase(): Promise<void> {
  await pool.end();
}
