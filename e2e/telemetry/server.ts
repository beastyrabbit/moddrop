import { spawn } from "node:child_process";
import {
  cp,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Exercise the built standalone app with the same public marker substitution
// as docker-entrypoint.sh. Never modify the original .next build.
const directory = await mkdtemp(join(tmpdir(), "moddrop-telemetry-"));
await cp(".next/standalone", directory, {
  recursive: true,
  verbatimSymlinks: true,
});
await cp(".next/static", join(directory, ".next/static"), { recursive: true });
await cp("public", join(directory, "public"), { recursive: true });
const key = `pk_test_${Buffer.from("clerk.telemetry.invalid$").toString("base64")}`;
const port = process.env.MODDROP_TELEMETRY_TEST_PORT ?? "43920";
const origin = `http://127.0.0.1:${port}`;
async function inject(path: string) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = join(path, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules") await inject(file);
    } else if (/\.(?:js|json|html|rsc|txt)$/.test(file)) {
      const source = await readFile(file, "utf8");
      if (source.includes("pk_placeholder_CLERK_KEY"))
        await writeFile(
          file,
          source.replaceAll("pk_placeholder_CLERK_KEY", key),
        );
    }
  }
}
await inject(directory);
const server = spawn(process.execPath, ["server.js"], {
  cwd: directory,
  env: {
    PATH: process.env.PATH,
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: key,
    NEXT_PUBLIC_CANVAS_API_URL: "/canvas-api",
    PORT: port,
    HOSTNAME: "127.0.0.1",
    UMAMI_HOST_URL: origin,
    UMAMI_WEBSITE_ID: "telemetry-fixture",
    UMAMI_DOMAINS: "127.0.0.1",
    GLITCHTIP_DSN: `http://public@127.0.0.1:${port}/10`,
    GLITCHTIP_ENVIRONMENT: "test",
    GLITCHTIP_TRACES_SAMPLE_RATE: "0",
    APP_RELEASE: "moddrop@telemetry-test",
  },
  stdio: "inherit",
});
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    stopping = true;
    server.kill(signal);
  });
server.on("exit", async (code) => {
  await rm(directory, { recursive: true, force: true });
  process.exit(stopping ? 0 : (code ?? 1));
});
