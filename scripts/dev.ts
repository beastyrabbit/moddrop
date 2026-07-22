import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const composeArgs = ["compose", "-f", "compose.dev.yml"];
const localDatabaseUrl =
  process.env.MODDROP_DEV_DATABASE_URL ??
  "postgresql://moddrop:moddrop@127.0.0.1:5432/moddrop";
const childEnvironment = {
  ...process.env,
  DATABASE_URL: localDatabaseUrl,
  CLERK_PUBLISHABLE_KEY:
    process.env.CLERK_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
};

let devProcess: ChildProcess | null = null;
let requestedSignal: NodeJS.Signals | null = null;
let composeAttempted = false;

function requestShutdown(signal: NodeJS.Signals): void {
  requestedSignal ??= signal;
  if (devProcess && !devProcess.killed) {
    devProcess.kill(signal);
  }
}

process.once("SIGINT", () => requestShutdown("SIGINT"));
process.once("SIGTERM", () => requestShutdown("SIGTERM"));

let exitCode = 0;

try {
  assertRequiredEnvironment();
  console.log(
    "[dev] Starting PostgreSQL and waiting for it to become healthy...",
  );
  composeAttempted = true;
  await run("docker", [...composeArgs, "up", "--wait", "postgres"]);
  throwIfStopping();

  console.log("[dev] Applying Drizzle migrations...");
  await run("pnpm", ["--dir", "backend/stream-canvas", "run", "db:migrate"]);
  throwIfStopping();

  console.log("[dev] Starting Moddrop, Convex, and the canvas backend...");
  devProcess = spawn("pnpm", ["run", "dev:apps"], {
    cwd: projectRoot,
    env: childEnvironment,
    stdio: "inherit",
  });
  const result = await waitForExit(devProcess);
  if (!requestedSignal && result.code !== 0) {
    exitCode = result.code ?? 1;
  }
} catch (error) {
  if (!requestedSignal) {
    console.error(
      "[dev] Startup failed:",
      error instanceof Error ? error.message : error,
    );
    exitCode = 1;
  }
} finally {
  devProcess = null;
  if (composeAttempted) {
    console.log("[dev] Stopping PostgreSQL...");
    try {
      await run("docker", [...composeArgs, "down", "--remove-orphans"]);
    } catch (error) {
      console.error(
        "[dev] PostgreSQL cleanup failed:",
        error instanceof Error ? error.message : error,
      );
      exitCode = 1;
    }
  }
}

process.exitCode = exitCode;

function assertRequiredEnvironment(): void {
  const required = [
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CLERK_SECRET_KEY",
    "CLERK_JWT_ISSUER_DOMAIN",
  ] as const;
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Local development is missing Clerk variables: ${missing.join(", ")}`,
    );
  }

  if (
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_") ||
    !process.env.CLERK_SECRET_KEY?.startsWith("sk_test_")
  ) {
    throw new Error(
      "Local development requires Clerk Development instance keys (pk_test_ and sk_test_). Production keys are restricted to moddrop.live and cannot serve moddrop.localhost.",
    );
  }
}

function throwIfStopping(): void {
  if (requestedSignal) {
    throw new Error(`Shutdown requested by ${requestedSignal}`);
  }
}

async function run(command: string, args: string[]): Promise<void> {
  const child = spawn(command, args, {
    cwd: projectRoot,
    env: childEnvironment,
    stdio: "inherit",
  });
  const result = await waitForExit(child);
  if (result.code !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} exited with ${result.code ?? result.signal ?? "an unknown status"}`,
    );
  }
}

function waitForExit(
  child: ChildProcess,
): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}
