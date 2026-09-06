import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { expect, test } from "vitest";

test.each(["migration", "frontend", "cleanup", "signal"])(
  "browser fixture releases partial startup resources after %s failure or interruption",
  async (failure) => {
    const root = await mkdtemp(join(tmpdir(), "browser-cleanup-test-"));
    const storage = join(root, "temporary");
    const backendRoot = join(root, "backend/stream-canvas");
    const probe = createServer();
    probe.listen(0, "127.0.0.1");
    await once(probe, "listening");
    const address = probe.address();
    if (!address || typeof address === "string")
      throw new Error("Missing port");
    const port = address.port;
    await new Promise<void>((resolve) => probe.close(() => resolve()));
    let child: ReturnType<typeof spawn> | undefined;
    try {
      for (const directory of [
        "e2e",
        "temporary",
        "backend/stream-canvas/src",
        "node_modules/vite",
        "node_modules/pg",
      ])
        await mkdir(join(root, directory), { recursive: true });
      await writeFile(join(root, "package.json"), '{"type":"module"}');
      // Run the real orchestrator with isolated local substitutes for its services.
      await writeFile(
        join(root, "e2e/server.ts"),
        (await readFile("e2e/server.ts", "utf8")).replaceAll(
          "4312",
          String(port),
        ),
      );
      await writeFile(
        join(backendRoot, "src/migrate.ts"),
        failure === "signal"
          ? 'import { writeFileSync } from "node:fs"; writeFileSync("migration-started", "yes"); setInterval(() => {}, 1000);'
          : `process.exit(${failure === "migration" ? 1 : 0});`,
      );
      await writeFile(
        join(backendRoot, "src/index.ts"),
        `
        import { createServer } from "node:http";
        import { writeFileSync } from "node:fs";
        const server = createServer((req, res) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(req.url === "/ready" ? {} : { id: "fixture", obsSetupSecret: "synthetic" }));
        });
        server.listen(Number(process.env.PORT), "127.0.0.1");
        process.on("SIGTERM", () => { writeFileSync("backend-stopped", "yes"); server.close(() => process.exit(0)); });
      `,
      );
      await writeFile(
        join(root, "node_modules/vite/package.json"),
        '{"type":"module","exports":"./index.js"}',
      );
      await writeFile(
        join(root, "node_modules/vite/index.js"),
        'export async function createServer() { throw new Error("injected frontend startup failure"); }',
      );
      await writeFile(
        join(root, "node_modules/pg/package.json"),
        '{"type":"module","exports":"./index.js"}',
      );
      await writeFile(
        join(root, "node_modules/pg/index.js"),
        `
        import { writeFileSync } from "node:fs";
        export class Pool {
          async query() { writeFileSync("database-cleanup-attempted", "yes"); ${failure === "cleanup" ? 'throw new Error("injected cleanup failure");' : ""} }
          async end() {}
        }
      `,
      );
      child = spawn(process.execPath, ["e2e/server.ts"], {
        cwd: root,
        env: {
          NODE_ENV: "test",
          PATH: process.env.PATH,
          TMPDIR: storage,
          TMP: storage,
          TEMP: storage,
          CANVAS_TEST_DATABASE_URL: "postgresql://unused.invalid/fixture",
        },
        stdio: "ignore",
      });
      const exited = once(child, "exit");
      if (failure === "signal") {
        const deadline = Date.now() + 3_000;
        while (!(await readdir(backendRoot)).includes("migration-started")) {
          if (Date.now() > deadline)
            throw new Error("Migration fixture did not start");
          await delay(10);
        }
        child.kill("SIGTERM");
      }
      const [code, signal] = await exited;
      expect(signal).toBeNull();
      expect(code).toBe(failure === "signal" ? 0 : 1);
      expect(await readdir(storage)).toEqual([]);
      if (failure === "frontend" || failure === "cleanup") {
        expect(
          await readFile(join(backendRoot, "backend-stopped"), "utf8"),
        ).toBe("yes");
        expect(
          await readFile(
            join(backendRoot, "database-cleanup-attempted"),
            "utf8",
          ),
        ).toBe("yes");
      } else {
        expect(await readdir(backendRoot)).not.toContain(
          "database-cleanup-attempted",
        );
      }
    } finally {
      if (child && child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
        await once(child, "exit");
      }
      await rm(root, { recursive: true, force: true });
    }
  },
  5_000,
);
