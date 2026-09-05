import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import vm from "node:vm";

async function files(directory: string): Promise<string[]> {
  return (
    await Promise.all(
      (
        await readdir(directory, { withFileTypes: true })
      ).map((entry) =>
        entry.isDirectory()
          ? files(join(directory, entry.name))
          : [join(directory, entry.name)],
      ),
    )
  ).flat();
}
const candidates = await files(".next/static/chunks");
let source = "";
for (const file of candidates.filter((file) => file.endsWith(".js"))) {
  const text = await readFile(file, "utf8");
  if (
    text.includes("CANVAS_API") &&
    text.includes("__NEXT_PUBLIC_CANVAS_API_URL__")
  ) {
    source = text;
    break;
  }
}
assert.ok(
  source,
  "Expected the real Next.js API module built with the Docker marker",
);

for (const configured of [
  "/canvas-api",
  "https://canvas-runtime.invalid/alternate",
  "/custom-canvas",
]) {
  const registrations: unknown[] = [];
  const requests: string[] = [];
  const context = vm.createContext({
    TURBOPACK: registrations,
    document: { currentScript: null },
    window: {
      location: {
        protocol: "https:",
        host: "frontend.invalid",
        origin: "https://frontend.invalid",
      },
    },
    process: { env: { NODE_ENV: "production" } },
    URL,
    console,
    fetch: async (url: string) => {
      requests.push(url);
      return {
        ok: true,
        status: 200,
        json: async () => ({ url: "/uploads/fixture/file.png", expiresIn: 60 }),
      };
    },
  });
  vm.runInContext(
    source.split("__NEXT_PUBLIC_CANVAS_API_URL__").join(configured),
    context,
    { timeout: 2_000 },
  );
  function factories(value: unknown): ((runtime: unknown) => void)[] {
    if (typeof value === "function")
      return [value as (runtime: unknown) => void];
    return Array.isArray(value) ? value.flatMap(factories) : [];
  }
  const factory = factories(registrations).find((fn) =>
    fn.toString().includes('"buildEditorWsUrl"'),
  );
  assert.ok(factory, "Expected a compiled API factory");
  const exports: Record<string, unknown> = {};
  factory({
    s(entries: unknown[]) {
      for (let i = 0; i < entries.length; ) {
        const name = entries[i++] as string;
        const getter = entries[i++];
        exports[name] = typeof getter === "function" ? getter() : entries[i++];
      }
    },
  });
  const ws = (
    exports.buildEditorWsUrl as (room: string, token: string) => string
  )("fixture", "fixture-token");
  assert.equal(
    ws,
    `${configured.startsWith("/") ? `wss://frontend.invalid${configured}` : configured.replace("https:", "wss:")}/ws?roomId=fixture&token=fixture-token`,
  );
  assert.equal(
    await (
      exports.resolveEditorUploadUrl as (
        roomId: string,
        src: string,
        getToken: () => Promise<string>,
      ) => Promise<string>
    )(
      "fixture-room",
      "/uploads/fixture/file.png",
      async () => "synthetic-test-token",
    ),
    `${configured}/uploads/fixture/file.png`,
  );
  await (
    exports.createRoom as (getToken: () => Promise<string>) => Promise<unknown>
  )(async () => "synthetic-test-token");
  assert.equal(
    requests[0],
    `${configured}/api/rooms/fixture-room/uploads/fixture/access-url`,
  );
  assert.equal(requests[1], `${configured}/api/rooms`);
}
console.log(
  "Compiled runtime API, WebSocket, and asset URLs passed for default, absolute, and alternate paths.",
);
