import { spawn } from "node:child_process";
import { generateKeyPairSync, randomBytes, sign } from "node:crypto";
import { once } from "node:events";
import { createServer as createHttpServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { createServer } from "vite";

if (!process.env.CANVAS_TEST_DATABASE_URL)
  throw new Error(
    "CANVAS_TEST_DATABASE_URL must point to an isolated test database",
  );
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const directory = await mkdtemp(join(tmpdir(), "moddrop-browser-"));
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
  UPLOADS_DIR: directory,
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
const migration = spawn(process.execPath, ["src/migrate.ts"], {
  cwd: join(root, "backend/stream-canvas"),
  env,
  stdio: "inherit",
});
const [migrationCode] = await once(migration, "exit");
if (migrationCode !== 0) throw new Error("Fixture migrations failed");
const backend = spawn(process.execPath, ["src/index.ts"], {
  cwd: join(root, "backend/stream-canvas"),
  env,
  stdio: "inherit",
});
for (let attempt = 0; ; attempt++) {
  if (backend.exitCode !== null || attempt === 100)
    throw new Error("Fixture backend did not become ready");
  const response = await fetch(`${backendBase}/ready`).catch(() => null);
  if (response?.ok) break;
  await delay(100);
}
const created = await fetch(`${backendBase}/api/rooms`, {
  method: "POST",
  headers: { Origin: origin, Authorization: `Bearer ${token()}` },
});
if (!created.ok) throw new Error("Fixture room creation failed");
const room = (await created.json()) as { id: string; obsSetupSecret: string };
const frontend = createHttpServer();
const vite = await createServer({
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
frontend.on("request", vite.middlewares);
frontend.listen(4310, "127.0.0.1");
await once(frontend, "listening");
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await vite.close();
  await new Promise<void>((resolve, reject) => {
    frontend.close((error) => (error ? reject(error) : resolve()));
  });
  backend.kill("SIGTERM");
  if (backend.exitCode === null && backend.signalCode === null)
    await once(backend, "exit");
  // Remove only this fixture's records, using the backend's installed pg package.
  const cleanup = spawn(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      'import { Pool } from "pg"; const pool = new Pool({connectionString:process.env.DATABASE_URL}); await pool.query("DELETE FROM rooms WHERE owner_clerk_id = $1", [process.env.FIXTURE_OWNER]); await pool.end();',
    ],
    {
      cwd: join(root, "backend/stream-canvas"),
      env: { ...env, FIXTURE_OWNER: owner },
      stdio: "inherit",
    },
  );
  const [cleanupCode] = await once(cleanup, "exit");
  if (cleanupCode !== 0) throw new Error("Fixture database cleanup failed");
  await rm(directory, { recursive: true, force: true });
}
function requestStop() {
  if (stopping) return;
  void stop().then(
    () => process.exit(0),
    (error) => {
      console.error("[browser-fixture] cleanup failed", error);
      process.exit(1);
    },
  );
}
process.on("SIGTERM", requestStop);
process.on("SIGINT", requestStop);
