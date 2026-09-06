import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { createServer, type IncomingMessage } from "node:http";
import test from "node:test";
import { Client } from "minio";
import { ObjectStoreTransport } from "./object-store-transport.ts";

test("Minio rejection cancels an unconsumed error body", async (t) => {
  let closed: Promise<unknown> | undefined;
  const server = createServer((_req, res) => {
    closed = once(res, "close");
    res.writeHead(503);
    res.write("partial error body");
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const requests = new ObjectStoreTransport(false);
  const client = new Client({
    endPoint: "127.0.0.1",
    port: address.port,
    useSSL: false,
    accessKey: randomBytes(16).toString("hex"),
    secretKey: randomBytes(32).toString("hex"),
    region: "fixture",
    transport: requests.transport,
    retryOptions: { disableRetry: true },
  });
  await assert.rejects(
    requests.run(() => client.getObject("fixture", "media"), 1_000),
  );
  assert.ok(closed);
  await closed;
});

test("object-store deadlines destroy stalled requests and free a subsequent request", async (t) => {
  let closed = false;
  const server = createServer((req, res) => {
    if (req.url === "/healthy") return res.end("ok");
    req.on("close", () => {
      closed = true;
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const requests = new ObjectStoreTransport(false);
  const request = (path: string) =>
    new Promise<IncomingMessage>((resolve, reject) => {
      const req = requests.transport.request(
        { hostname: "127.0.0.1", port: address.port, path },
        resolve,
      );
      req.on("error", reject);
      req.end();
    });
  await assert.rejects(
    requests.run(() => request("/stalled"), 30),
    { name: "AbortError" },
  );
  const response = await requests.run(() => request("/healthy"), 1_000);
  const chunks = [];
  for await (const chunk of response) chunks.push(chunk);
  assert.equal(Buffer.concat(chunks).toString(), "ok");
  assert.equal(closed, true);
});

test("object-store deadlines remain attached to a stalled response stream", async (t) => {
  const server = createServer((_req, res) => {
    res.writeHead(200);
    res.write("partial");
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const requests = new ObjectStoreTransport(false);
  const response = await requests.run(
    () =>
      new Promise<IncomingMessage>((resolve, reject) => {
        const req = requests.transport.request(
          { hostname: "127.0.0.1", port: address.port },
          resolve,
        );
        req.on("error", reject);
        req.end();
      }),
    30,
  );
  await assert.rejects(async () => {
    for await (const _chunk of response) {
      /* Drain until cancellation. */
    }
  });
  assert.equal(response.destroyed, true);
});
