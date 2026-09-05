import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { sql } from "drizzle-orm";
import { WebSocketServer } from "ws";
import { config, validateServerConfig } from "./config.ts";
import { withDeadline } from "./deadline.ts";
import { closeDatabase, db } from "./db.ts";
import { leaderState } from "./leader.ts";
import { objectStore } from "./object-store.ts";
import { api } from "./routes.ts";
import { closeAllRooms, handleWebSocketUpgrade } from "./ws-handler.ts";

// ---------------------------------------------------------------------------
// Hono app
// ---------------------------------------------------------------------------

validateServerConfig();

const app = new Hono();

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

// ---------------------------------------------------------------------------
// HTTP server + WebSocket upgrade
// ---------------------------------------------------------------------------

const server = serve({ fetch: app.fetch, port: config.port });

const wss = new WebSocketServer({
  noServer: true,
  maxPayload: 256 * 1024,
  perMessageDeflate: false,
});

leaderState.onDemote(async (persist) => {
  for (const client of wss.clients) client.close(1012, "Service restarting");
  await closeAllRooms(persist);
});
leaderState.start();

server.on("upgrade", (req, socket, head) => {
  if (!leaderState.isLeader) {
    socket.destroy();
    return;
  }
  let url: URL;
  try {
    url = new URL(req.url ?? "", "http://stream-canvas.local");
  } catch {
    socket.destroy();
    return;
  }

  // Only upgrade requests to /ws
  if (url.pathname !== "/ws") {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    handleWebSocketUpgrade(ws, req).catch((err) => {
      console.error("[ws] upgrade handler failed:", err);
      ws.close(1011, "Internal error");
    });
  });
});

console.log(`[stream-canvas] listening on http://localhost:${config.port}`);

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

let shutdownPromise: Promise<void> | null = null;

function shutdown(): Promise<void> {
  shutdownPromise ??= performShutdown();
  return shutdownPromise;
}

async function performShutdown(): Promise<void> {
  console.log("[stream-canvas] shutting down...");
  await leaderState.stop();
  for (const client of wss.clients) client.close(1012, "Service restarting");
  await closeAllRooms();
  await new Promise<void>((resolve) => wss.close(() => resolve()));
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await closeDatabase();
  console.log("[stream-canvas] shutdown complete");
}

function requestShutdown(): void {
  void withDeadline(
    shutdown(),
    25_000,
    "Shutdown; pending data may not be durable",
  ).then(
    () => process.exit(0),
    (error) => {
      console.error("[stream-canvas] shutdown failed", error);
      process.exit(1);
    },
  );
}

process.on("SIGINT", requestShutdown);
process.on("SIGTERM", requestShutdown);
