import { serve } from "@hono/node-server";
import { WebSocketServer } from "ws";
import { config, validateServerConfig } from "./config.ts";
import { withDeadline } from "./deadline.ts";
import { closeDatabase } from "./db.ts";
import { leaderState } from "./leader.ts";
import { app } from "./app.ts";
import { closeAllRooms, handleWebSocketUpgrade } from "./ws-handler.ts";

// ---------------------------------------------------------------------------
// Hono app
// ---------------------------------------------------------------------------

validateServerConfig();

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
