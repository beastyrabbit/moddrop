import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { WebSocketServer } from "ws";
import { config } from "./config.ts";
import { api } from "./routes.ts";
import { closeAllRooms, handleWebSocketUpgrade } from "./ws-handler.ts";

// ---------------------------------------------------------------------------
// Hono app
// ---------------------------------------------------------------------------

const app = new Hono();

app.use("*", cors({ origin: config.corsOrigins }));
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

server.on("upgrade", (req, socket, head) => {
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

function shutdown() {
  console.log("[stream-canvas] shutting down...");
  closeAllRooms();
  wss.close();
  server.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
