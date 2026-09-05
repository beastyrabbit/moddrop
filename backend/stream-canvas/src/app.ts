import { Hono } from "hono";
import { cors } from "hono/cors";
import { sql } from "drizzle-orm";
import { config } from "./config.ts";
import { withDeadline } from "./deadline.ts";
import { db } from "./db.ts";
import { leaderState } from "./leader.ts";
import { objectStore } from "./object-store.ts";
import { api } from "./routes.ts";

// Importable HTTP wiring, without starting listeners or leadership timers.
export const app = new Hono();
app.use("*", cors({ origin: config.corsOrigins }));
app.get("/health", (c) => c.json({ status: "ok" }));
app.get("/ready", async (c) => {
  if (!leaderState.isLeader) {
    return c.json({ status: "standby", role: "standby" }, 503);
  }
  try {
    await withDeadline(
      Promise.all([db.execute(sql`SELECT 1`), objectStore.check()]),
      3_000,
      "Readiness",
    );
    if (!leaderState.isLeader)
      return c.json({ status: "standby", role: "standby" }, 503);
    return c.json({ status: "ready", role: "leader" });
  } catch (error) {
    console.error("[readiness] dependency check failed", error);
    return c.json({ status: "unavailable", role: "leader" }, 503);
  }
});
app.use("*", async (c, next) => {
  if (!leaderState.isLeader) {
    c.header("Retry-After", "2");
    return c.json({ error: "Canvas leader is changing" }, 503);
  }
  return next();
});
app.route("/", api);
