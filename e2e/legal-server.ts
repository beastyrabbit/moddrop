import { spawn } from "node:child_process";
import { once } from "node:events";
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

// Mirror the production runtime-marker substitution in an isolated copy of the
// actual standalone build. CI builds with a deliberately invalid Clerk marker.
// Neither the original build nor an existing local environment file is changed.
const directory = await mkdtemp(join(tmpdir(), "moddrop-legal-"));
const publishableKey = "pk_test_Y2xlcmsuZXhhbXBsZS50ZXN0JA";
const extensions = /\.(?:html|js|json|mjs|rsc|txt)$/;

async function inject(path: string): Promise<void> {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const target = join(path, entry.name);
    if (entry.isDirectory()) await inject(target);
    else if (entry.isFile() && extensions.test(entry.name)) {
      const original = await readFile(target, "utf8");
      const replaced = original
        .replaceAll("pk_placeholder_CLERK_KEY", publishableKey)
        .replaceAll("__NEXT_PUBLIC_CANVAS_API_URL__", "/canvas-api");
      if (original !== replaced) await writeFile(target, replaced);
    }
  }
}

let child: ReturnType<typeof spawn> | undefined;
function stop() {
  child?.kill("SIGTERM");
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
try {
  await cp(".next/standalone", directory, { recursive: true });
  await cp(".next/static", join(directory, ".next/static"), {
    recursive: true,
  });
  await cp("public", join(directory, "public"), { recursive: true });
  await inject(join(directory, ".next"));
  child = spawn(process.execPath, [join(directory, "server.js")], {
    cwd: directory,
    stdio: "inherit",
    env: {
      PATH: process.env.PATH,
      NODE_ENV: "production",
      HOSTNAME: "127.0.0.1",
      PORT: "4313",
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey,
      NEXT_PUBLIC_CANVAS_API_URL: "/canvas-api",
    },
  });
  const [code] = await once(child, "exit");
  process.exitCode = code ?? 0;
} finally {
  process.off("SIGTERM", stop);
  process.off("SIGINT", stop);
  await rm(directory, { recursive: true, force: true });
}
