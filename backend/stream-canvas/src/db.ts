import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "./config.ts";
import * as schema from "./schema.ts";

async function createPool(): Promise<Pool> {
  if (config.databaseUrl.startsWith("pg-mem://")) {
    if (config.nodeEnv !== "test") {
      throw new Error("The in-memory PostgreSQL adapter is test-only.");
    }
    const { newDb } = await import("pg-mem");
    const memoryDatabase = newDb({ autoCreateForeignKeyIndices: true });
    const adapter = memoryDatabase.adapters.createPg();
    type MemoryQuery = (...args: unknown[]) => unknown;
    const prototype = adapter.Pool.prototype as unknown as {
      query: MemoryQuery;
    };
    const query = prototype.query;
    prototype.query = async function queryWithoutUnsupportedOptions(...args) {
      const [queryConfig, ...rest] = args;
      const wantsRowArray =
        queryConfig !== null &&
        typeof queryConfig === "object" &&
        "rowMode" in queryConfig &&
        queryConfig.rowMode === "array";
      const sanitizedConfig =
        queryConfig && typeof queryConfig === "object"
          ? Object.fromEntries(
              Object.entries(queryConfig).filter(
                ([key]) => key !== "types" && key !== "rowMode",
              ),
            )
          : queryConfig;
      const result = await query.apply(this, [sanitizedConfig, ...rest]);
      if (
        wantsRowArray &&
        result !== null &&
        typeof result === "object" &&
        "rows" in result &&
        Array.isArray(result.rows)
      ) {
        return {
          ...result,
          rows: result.rows.map((row) =>
            row && typeof row === "object" ? Object.values(row) : row,
          ),
        };
      }
      return result;
    };
    return new adapter.Pool() as unknown as Pool;
  }

  return new Pool({
    connectionString: config.databaseUrl,
    max: config.databasePoolSize,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 10_000,
    query_timeout: 12_000,
    application_name: "moddrop-stream-canvas",
  });
}

export const pool = await createPool();

pool.on("error", (error) => {
  console.error("[database] idle PostgreSQL connection failed", error);
});

export const db = drizzle(pool, { schema });

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
