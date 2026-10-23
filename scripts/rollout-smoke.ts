import { setTimeout as sleep } from "node:timers/promises";

function semver(version: string) {
  const buildAt = version.indexOf("+");
  const withoutBuild = buildAt < 0 ? version : version.slice(0, buildAt);
  if (
    buildAt >= 0 &&
    !/^[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*$/.test(version.slice(buildAt + 1))
  )
    throw new Error(`Invalid semver: ${version}`);
  const prereleaseAt = withoutBuild.indexOf("-");
  const core =
    prereleaseAt < 0 ? withoutBuild : withoutBuild.slice(0, prereleaseAt);
  const prerelease =
    prereleaseAt < 0 ? [] : withoutBuild.slice(prereleaseAt + 1).split(".");
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(core);
  if (!match) throw new Error(`Invalid semver: ${version}`);
  if (prerelease.some((part) => !validPrereleaseIdentifier(part)))
    throw new Error(`Invalid semver: ${version}`);
  return { core: match.slice(1, 4).map(BigInt), prerelease };
}

function validPrereleaseIdentifier(part: string) {
  return (
    /^[0-9A-Za-z-]+$/.test(part) && !(/^\d+$/.test(part) && /^0\d/.test(part))
  );
}

function compareIdentifiers(x: string, y: string): number {
  if (x === y) return 0;
  const numericX = /^\d+$/.test(x);
  const numericY = /^\d+$/.test(y);
  if (numericX && numericY) return BigInt(x) > BigInt(y) ? 1 : -1;
  if (numericX !== numericY) return numericX ? -1 : 1;
  return x > y ? 1 : -1;
}

function comparePrerelease(a: string[], b: string[]): number {
  if (!a.length || !b.length) return Number(!a.length) - Number(!b.length);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i];
    const y = b[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const order = compareIdentifiers(x, y);
    if (order) return order;
  }
  return 0;
}

export function compareVersions(left: string, right: string): number {
  const a = semver(left);
  const b = semver(right);
  for (let i = 0; i < 3; i++) {
    if (a.core[i] !== b.core[i]) return a.core[i] > b.core[i] ? 1 : -1;
  }
  return comparePrerelease(a.prerelease, b.prerelease);
}

function findNewer(releases: (string | null)[], version: string) {
  return releases.find(
    (release) => release && compareVersions(release.slice(8), version) > 0,
  );
}

type SmokeOptions = {
  baseUrl: string;
  version: string;
  timeoutMs?: number;
  pollMs?: number;
  readyTimeoutMs?: number;
  fetch?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<unknown>;
  log?: (message: string) => void;
};

export async function rolloutSmoke(options: SmokeOptions) {
  const {
    baseUrl,
    version,
    timeoutMs = 30 * 60_000,
    pollMs = 20_000,
    readyTimeoutMs = 60_000,
    fetch: request = fetch,
    now = Date.now,
    sleep: pause = sleep,
    log = console.log,
  } = options;
  semver(version);
  for (const duration of [timeoutMs, pollMs, readyTimeoutMs]) {
    if (!Number.isFinite(duration) || duration <= 0)
      throw new Error("Rollout durations must be positive finite milliseconds");
  }
  const deadline = now() + timeoutMs;
  const paths = ["/telemetry-config", "/canvas-api/version"];
  const last = new Map(paths.map((path) => [path, "not checked"]));
  const expected = `moddrop@${version}`;
  const timedOut = () =>
    new Error(`Rollout timed out: ${JSON.stringify(Object.fromEntries(last))}`);
  async function get(path: string, end = deadline) {
    if (now() >= deadline) throw timedOut();
    if (now() >= end) throw new Error("deadline reached");
    return request(new URL(path, baseUrl), {
      cache: "no-store",
      signal: AbortSignal.timeout(Math.max(1, Math.min(10_000, end - now()))),
    });
  }
  const wait = async (end: number) => {
    const remaining = end - now();
    if (remaining > 0) await pause(Math.min(pollMs, remaining));
  };
  async function readRelease(path: string) {
    try {
      const response = await get(path);
      if (!response.ok) {
        last.set(path, `HTTP ${response.status}`);
        return null;
      }
      const body: unknown = await response.json();
      if (
        !body ||
        typeof body !== "object" ||
        !("release" in body) ||
        typeof body.release !== "string" ||
        !body.release.startsWith("moddrop@")
      )
        throw new Error("missing release");
      const release = body.release;
      semver(release.slice("moddrop@".length));
      last.set(path, release);
      return release;
    } catch {
      last.set(path, "network error, invalid JSON or invalid release");
      return null;
    }
  }
  async function checkHealth(readyDeadline: number) {
    let homeOk = false;
    let home = "not checked";
    let ready = "not checked";
    while (now() < readyDeadline) {
      if (!homeOk) {
        try {
          const response = await get("/", readyDeadline);
          home = `HTTP ${response.status}`;
          homeOk = response.ok;
        } catch {
          home = "network error";
        }
        if (!homeOk) {
          await wait(readyDeadline);
          continue;
        }
      }
      try {
        const response = await get("/canvas-api/ready", readyDeadline);
        ready = `HTTP ${response.status}`;
        if (response.status === 200) {
          log(`Rollout healthy: both components report ${expected}.`);
          return "healthy";
        }
      } catch {
        ready = "network error";
      }
      await wait(readyDeadline);
    }
    throw new Error(
      `Readiness timed out: /: ${home}; /canvas-api/ready: ${ready}; ${JSON.stringify(Object.fromEntries(last))}`,
    );
  }
  while (now() < deadline) {
    // Inspect both responses before health checks, so a newer component wins
    // even when the other component is still rolling out or unavailable.
    const releases = await Promise.all(paths.map(readRelease));
    const newer = findNewer(releases, version);
    if (newer) {
      log(
        `::notice::Rollout superseded: expected ${expected}, observed ${newer}. Skipping remaining checks.`,
      );
      return "superseded";
    }
    log(paths.map((path) => `${path}: ${last.get(path)}`).join("; "));
    if (releases.every((release) => release === expected)) {
      if (now() >= deadline) throw timedOut();
      const readyDeadline = Math.min(deadline, now() + readyTimeoutMs);
      return checkHealth(readyDeadline);
    }
    await wait(deadline);
  }
  throw timedOut();
}

if (import.meta.main) {
  try {
    await rolloutSmoke({
      baseUrl: process.argv[2] ?? "https://moddrop.live",
      version: process.argv[3] ?? "",
      timeoutMs: Number(
        process.argv[4] ?? process.env.ROLLOUT_TIMEOUT_MS ?? 1_800_000,
      ),
    });
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Rollout check failed",
    );
    process.exitCode = 1;
  }
}
