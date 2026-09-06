import { type ChildProcess, spawn } from "node:child_process";
import { generateKeyPairSync, randomBytes, sign } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

if (!process.env.CANVAS_TEST_DATABASE_URL)
  throw new Error(
    "CANVAS_TEST_DATABASE_URL must point to an isolated test database",
  );
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const origin = "http://127.0.0.1:4310";
const backendBase = "http://127.0.0.1:4312";
const owner = `user_fixture_${crypto.randomUUID()}`;
const env: NodeJS.ProcessEnv = {
  PATH: process.env.PATH,
  NODE_ENV: "test",
  PORT: "4312",
  DATABASE_URL: process.env.CANVAS_TEST_DATABASE_URL,
  OBJECT_STORAGE_MODE: "filesystem",
  CORS_ORIGINS: origin,
  CLERK_JWT_KEY: publicKey.export({ type: "spki", format: "pem" }).toString(),
  CLERK_JWT_ISSUER_DOMAIN: "https://identity.example",
  OBS_TOKEN_SIGNING_SECRET: randomBytes(32).toString("hex"),
  UPLOAD_TOKEN_TTL: "60",
};
function token() {
  const now = Math.floor(Date.now() / 1000);
  const head = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT", kid: "test" }),
  ).toString("base64url");
  const body = Buffer.from(
    JSON.stringify({
      sub: owner,
      iss: "https://identity.example",
      azp: origin,
      iat: now,
      exp: now + 3600,
    }),
  ).toString("base64url");
  return `${head}.${body}.${sign("RSA-SHA256", Buffer.from(`${head}.${body}`), privateKey).toString("base64url")}`;
}
const shutdown = new AbortController();
let directory: string | undefined;
let migration: ChildProcess | undefined;
let backend: ChildProcess | undefined;
let frontend: ReturnType<typeof createHttpServer> | undefined;
let vite: Awaited<ReturnType<typeof createServer>> | undefined;
let roomCreationAttempted = false;
function requestStop() {
  shutdown.abort();
  // Interrupt a migration lock wait before any backend has started.
  migration?.kill("SIGTERM");
}
process.on("SIGTERM", requestStop);
process.on("SIGINT", requestStop);

try {
  directory = await mkdtemp(join(tmpdir(), "moddrop-browser-"));
  env.UPLOADS_DIR = directory;
  shutdown.signal.throwIfAborted();
  migration = spawn(process.execPath, ["src/migrate.ts"], {
    cwd: join(root, "backend/stream-canvas"),
    env,
    stdio: "inherit",
  });
  const [migrationCode] = await once(migration, "exit");
  migration = undefined;
  shutdown.signal.throwIfAborted();
  if (migrationCode !== 0) throw new Error("Fixture migrations failed");
  backend = spawn(process.execPath, ["src/index.ts"], {
    cwd: join(root, "backend/stream-canvas"),
    env,
    stdio: "inherit",
  });
  for (let attempt = 0; ; attempt++) {
    shutdown.signal.throwIfAborted();
    if (
      backend.exitCode !== null ||
      backend.signalCode !== null ||
      attempt === 100
    )
      throw new Error("Fixture backend did not become ready");
    const response = await fetch(`${backendBase}/ready`, {
      signal: AbortSignal.any([shutdown.signal, AbortSignal.timeout(1_000)]),
    }).catch(() => null);
    if (response?.ok) break;
    await delay(100);
  }
  shutdown.signal.throwIfAborted();
  roomCreationAttempted = true;
  const created = await fetch(`${backendBase}/api/rooms`, {
    method: "POST",
    headers: { Origin: origin, Authorization: `Bearer ${token()}` },
    signal: AbortSignal.any([shutdown.signal, AbortSignal.timeout(10_000)]),
  });
  if (!created.ok) throw new Error("Fixture room creation failed");
  const room = (await created.json()) as { id: string; obsSetupSecret: string };
  shutdown.signal.throwIfAborted();
  frontend = createHttpServer();
  vite = await createServer({
    configFile: false,
    root: join(root, "e2e"),
    server: {
      // Own shutdown: Vite's standalone SIGTERM handler calls process.exit()
      // before fixture database and upload cleanup can finish.
      middlewareMode: true,
      hmr: { server: frontend },
      fs: { allow: [root] },
    },
    resolve: {
      alias: [
        { find: "@clerk/nextjs", replacement: join(root, "e2e/clerk.tsx") },
        { find: "convex/react", replacement: join(root, "e2e/convex.ts") },
        { find: "@", replacement: root },
      ],
      dedupe: ["react", "react-dom"],
    },
    define: {
      "process.env.NEXT_PUBLIC_CANVAS_API_URL": JSON.stringify(backendBase),
      "process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY": JSON.stringify(""),
    },
    plugins: [
      {
        name: "local-fixture-session",
        configureServer(server) {
          server.middlewares.use("/__test/session", (_req, res) => {
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                roomId: room.id,
                secret: room.obsSetupSecret,
                token: token(),
              }),
            );
          });
        },
      },
    ],
  });
  shutdown.signal.throwIfAborted();
  frontend.on("request", vite.middlewares);
  frontend.listen(4310, "127.0.0.1");
  await once(frontend, "listening");
  if (!shutdown.signal.aborted) await once(shutdown.signal, "abort");
} catch (error) {
  if (!shutdown.signal.aborted) {
    console.error("[browser-fixture] startup failed", error);
    process.exitCode = 1;
  }
} finally {
  // Each cleanup runs even if another fails, including failures before listen().
  const cleanupErrors: unknown[] = [];
  async function cleanup(operation: () => Promise<unknown>) {
    try {
      await operation();
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  await cleanup(async () => vite?.close());
  const http = frontend;
  if (http?.listening)
    await cleanup(
      () =>
        new Promise<void>((resolve, reject) => {
          http.close((error) => (error ? reject(error) : resolve()));
          http.closeAllConnections();
        }),
    );
  for (const child of [migration, backend]) {
    if (!child || child.exitCode !== null || child.signalCode !== null)
      continue;
    await cleanup(async () => {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      const deadline = setTimeout(() => child.kill("SIGKILL"), 27_000);
      try {
        const [, signal] = await exited;
        if (signal === "SIGKILL")
          throw new Error("Fixture child shutdown timed out");
      } finally {
        clearTimeout(deadline);
      }
    });
  }
  // Remove only this fixture's records, using the backend's installed pg package.
  if (roomCreationAttempted)
    await cleanup(async () => {
      const databaseCleanup = spawn(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          'import { Pool } from "pg"; const pool = new Pool({connectionString:process.env.DATABASE_URL, connectionTimeoutMillis:2000, statement_timeout:2000, query_timeout:2500}); try { await pool.query("DELETE FROM rooms WHERE owner_clerk_id = $1", [process.env.FIXTURE_OWNER]); } finally { await pool.end(); }',
        ],
        {
          cwd: join(root, "backend/stream-canvas"),
          env: { ...env, FIXTURE_OWNER: owner },
          stdio: "inherit",
        },
      );
      const [cleanupCode] = await once(databaseCleanup, "exit");
      if (cleanupCode !== 0) throw new Error("Fixture database cleanup failed");
    });
  if (directory) {
    const uploadsDirectory = directory;
    await cleanup(() => rm(uploadsDirectory, { recursive: true, force: true }));
  }
  process.off("SIGTERM", requestStop);
  process.off("SIGINT", requestStop);
  if (cleanupErrors.length) {
    console.error(
      "[browser-fixture] cleanup failed",
      new AggregateError(cleanupErrors),
    );
    process.exitCode = 1;
  }
  process.exit(Number(process.exitCode ?? 0));
}
