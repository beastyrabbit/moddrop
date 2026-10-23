import { expect, test, vi } from "vitest";
import { compareVersions, rolloutSmoke } from "./rollout-smoke";

const old = "moddrop@0.8.0";
const expected = "moddrop@0.9.0";
const newer = "moddrop@0.10.0";
type Reply = string | number | Error | { malformed: true };
function fixture(frontend: Reply[], backend: Reply[], ready: Reply[] = [200]) {
  let now = 0;
  const queues: Record<string, Reply[]> = {
    "/telemetry-config": [...frontend],
    "/canvas-api/version": [...backend],
    "/": [200],
    "/canvas-api/ready": [...ready],
  };
  const request = vi.fn<typeof fetch>(async (input) => {
    const path = new URL(String(input)).pathname;
    const queue = queues[path];
    if (!queue?.length) throw new Error(`Unexpected request ${path}`);
    const reply = queue.length > 1 ? queue.shift() : queue[0];
    if (reply instanceof Error) throw reply;
    if (typeof reply === "number") return new Response("", { status: reply });
    if (typeof reply === "object") return new Response("<html>not JSON");
    return Response.json({ release: reply });
  });
  const log = vi.fn();
  return {
    request,
    log,
    queues,
    options: {
      baseUrl: "https://fixture.invalid",
      version: "0.9.0",
      timeoutMs: 100,
      pollMs: 20,
      readyTimeoutMs: 40,
      now: () => now,
      sleep: async (ms: number) => {
        now += ms;
      },
      fetch: request,
      log,
    },
  };
}

test.each([
  [
    [old, expected],
    [old, expected],
  ],
  [[expected], [old, expected]],
  [[old, expected], [expected]],
  [[404, expected], [expected]],
  [
    [500, expected],
    [503, expected],
  ],
  [[new Error("offline"), expected], [expected]],
  [[{ malformed: true }, expected], [expected]],
  [["not-a-release", expected], [expected]],
] satisfies [Reply[], Reply[]][])(
  "waits for both versions, then checks homepage and retries readiness: %j / %j",
  async (frontend, backend) => {
    const { options, request } = fixture(frontend, backend, [503, 200]);
    expect(await rolloutSmoke(options)).toBe("healthy");
    const paths = request.mock.calls.map(
      ([url]) => new URL(String(url)).pathname,
    );
    expect(paths.slice(-5)).toEqual([
      "/",
      "/canvas-api/ready",
      "/telemetry-config",
      "/canvas-api/version",
      "/canvas-api/ready",
    ]);
    expect(
      request.mock.calls.every(([, init]) => init?.cache === "no-store"),
    ).toBe(true);
  },
);

test.each([
  [[newer], [expected]],
  [[expected], [newer]],
  [[newer], [old]],
  [[404], [newer]],
] satisfies [Reply[], Reply[]][])(
  "newer component supersedes the rollout: %j / %j",
  async (frontend, backend) => {
    const { options, request, log } = fixture(frontend, backend);
    expect(await rolloutSmoke(options)).toBe("superseded");
    expect(request).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("::notice::Rollout superseded"),
    );
  },
);

test.each([
  [[expected, old, expected], [expected]],
  [[expected], [expected, old, expected]],
  [[expected, 404, expected], [expected]],
  [[expected], [expected, 404, expected]],
  [[expected, new Error("offline"), expected], [expected]],
  [[expected], [expected, new Error("offline"), expected]],
  [[expected, { malformed: true }, expected], [expected]],
  [[expected], [expected, "moddrop@invalid", expected]],
] satisfies [Reply[], Reply[]][])(
  "version drift during readiness resumes polling before health checks: %j / %j",
  async (frontend, backend) => {
    const { options, request } = fixture(frontend, backend, [503, 200]);
    expect(await rolloutSmoke(options)).toBe("healthy");
    expect(
      request.mock.calls.map(([url]) => new URL(String(url)).pathname),
    ).toEqual([
      "/telemetry-config",
      "/canvas-api/version",
      "/",
      "/canvas-api/ready",
      "/telemetry-config",
      "/canvas-api/version",
      "/telemetry-config",
      "/canvas-api/version",
      "/",
      "/canvas-api/ready",
    ]);
    expect(options.now()).toBe(40);
  },
);

test("matching versions after drift start a fresh readiness window", async () => {
  const { options } = fixture(
    [expected, old, expected],
    [expected],
    [503, 503, 200],
  );
  expect(await rolloutSmoke(options)).toBe("healthy");
  expect(options.now()).toBe(60);
});

test.each([
  [old, expected, old, expected],
  [expected, 404, expected, "HTTP 404"],
] satisfies [Reply, Reply, string, string][])(
  "persistent version drift times out with the latest observations: %j / %j",
  async (frontend, backend, lastFrontend, lastBackend) => {
    const { options, request } = fixture(
      [expected, frontend],
      [expected, backend],
      [503, 200],
    );
    await expect(rolloutSmoke(options)).rejects.toThrow(
      `Rollout timed out: ${JSON.stringify({
        "/telemetry-config": lastFrontend,
        "/canvas-api/version": lastBackend,
      })}`,
    );
    const healthPaths = request.mock.calls
      .map(([url]) => new URL(String(url)).pathname)
      .filter((path) => path === "/" || path === "/canvas-api/ready");
    expect(healthPaths).toEqual(["/", "/canvas-api/ready"]);
    expect(options.now()).toBe(options.timeoutMs);
  },
);

test.each([
  [[expected, newer], [expected]],
  [[expected], [expected, newer]],
] satisfies [Reply[], Reply[]][])(
  "newer component supersedes a readiness retry: %j / %j",
  async (frontend, backend) => {
    const { options, request, log } = fixture(frontend, backend, [503, 200]);
    expect(await rolloutSmoke(options)).toBe("superseded");
    expect(
      request.mock.calls.map(([url]) => new URL(String(url)).pathname),
    ).toEqual([
      "/telemetry-config",
      "/canvas-api/version",
      "/",
      "/canvas-api/ready",
      "/telemetry-config",
      "/canvas-api/version",
    ]);
    expect(log).toHaveBeenCalledWith(
      `::notice::Rollout superseded: expected ${expected}, observed ${newer}. Skipping remaining checks.`,
    );
  },
);

test.each([
  [[expected, newer], [expected]],
  [[expected], [expected, newer]],
] satisfies [Reply[], Reply[]][])(
  "newer component supersedes a homepage retry: %j / %j",
  async (frontend, backend) => {
    const { options, queues, request, log } = fixture(frontend, backend);
    queues["/"] = [502, 200];
    expect(await rolloutSmoke(options)).toBe("superseded");
    expect(
      request.mock.calls.map(([url]) => new URL(String(url)).pathname),
    ).toEqual([
      "/telemetry-config",
      "/canvas-api/version",
      "/",
      "/telemetry-config",
      "/canvas-api/version",
    ]);
    expect(log).toHaveBeenCalledWith(
      `::notice::Rollout superseded: expected ${expected}, observed ${newer}. Skipping remaining checks.`,
    );
  },
);

test("timeout includes the last observation from each endpoint", async () => {
  const { options, request } = fixture([old], [404]);
  await expect(rolloutSmoke(options)).rejects.toThrow(
    'Rollout timed out: {"/telemetry-config":"moddrop@0.8.0","/canvas-api/version":"HTTP 404"}',
  );
  expect(request).toHaveBeenCalledTimes(10);
});

test("deadline reached as matching versions arrive retains both observations", async () => {
  const { options, request } = fixture([expected], [expected]);
  const fetchAtDeadline: typeof fetch = async (url, init) => {
    const response = await request(url, init);
    await options.sleep(100);
    return response;
  };
  await expect(
    rolloutSmoke({ ...options, fetch: fetchAtDeadline }),
  ).rejects.toThrow(
    'Rollout timed out: {"/telemetry-config":"moddrop@0.9.0","/canvas-api/version":"moddrop@0.9.0"}',
  );
  expect(request).toHaveBeenCalledTimes(2);
});

test.each([
  [{ malformed: true }],
  [new Error("offline")],
  ["moddrop@invalid"],
] satisfies [Reply][])(
  "malformed and network responses stay pending until timeout: %j",
  async (replies) => {
    const { options } = fixture([replies], [expected]);
    await expect(rolloutSmoke(options)).rejects.toThrow("Rollout timed out");
  },
);

test.each([
  [502, "HTTP 502"],
  [new Error("offline"), "network error"],
] as const)(
  "homepage failure retries after matching releases: %j",
  async (reply, observation) => {
    const { options, queues, request } = fixture([expected], [expected]);
    queues["/"] = [reply];
    await expect(rolloutSmoke(options)).rejects.toThrow(
      `Readiness timed out: /: ${observation}; /canvas-api/ready: not checked`,
    );
    expect(
      request.mock.calls.slice(2).map(([url]) => new URL(String(url)).pathname),
    ).toEqual(["/", "/telemetry-config", "/canvas-api/version", "/"]);
    expect(options.now()).toBe(40);
  },
);

test.each([502, new Error("offline")])(
  "homepage recovers from a transient failure: %j",
  async (reply) => {
    const { options, queues, request } = fixture([expected], [expected]);
    queues["/"] = [reply, 200];
    expect(await rolloutSmoke(options)).toBe("healthy");
    expect(
      request.mock.calls.slice(2).map(([url]) => new URL(String(url)).pathname),
    ).toEqual([
      "/",
      "/telemetry-config",
      "/canvas-api/version",
      "/",
      "/canvas-api/ready",
    ]);
  },
);

test("readiness retries are bounded by the short window and overall deadline", async () => {
  const { options, request } = fixture([expected], [expected], [503]);
  await expect(rolloutSmoke({ ...options, timeoutMs: 30 })).rejects.toThrow(
    "Readiness timed out: /: HTTP 200; /canvas-api/ready: HTTP 503",
  );
  expect(request).toHaveBeenCalledTimes(7);
});

test("homepage retries share the readiness window and overall deadline", async () => {
  const { options, queues, request } = fixture([expected], [expected], [503]);
  queues["/"] = [502, 200];
  await expect(rolloutSmoke({ ...options, timeoutMs: 30 })).rejects.toThrow(
    "Readiness timed out: /: HTTP 200; /canvas-api/ready: HTTP 503",
  );
  expect(options.now()).toBe(30);
  expect(
    request.mock.calls.slice(2).map(([url]) => new URL(String(url)).pathname),
  ).toEqual([
    "/",
    "/telemetry-config",
    "/canvas-api/version",
    "/",
    "/canvas-api/ready",
  ]);
});

test.each([
  ["0.10.0", "0.9.0", 1],
  ["1.0.0", "1.0.0-rc.1", 1],
  ["1.0.0-rc.10", "1.0.0-rc.2", 1],
  ["1.0.0-alpha", "1.0.0-alpha.1", -1],
  ["1.0.0-1", "1.0.0-alpha", -1],
  ["1.0.0+build.2", "1.0.0+build.1", 0],
] as const)("compares semver %s and %s", (a, b, expectedOrder) => {
  expect(compareVersions(a, b)).toBe(expectedOrder);
});

test("invalid versions and deadlines fail before any request", async () => {
  const { options, request } = fixture([expected], [expected]);
  for (const version of ["bad", "01.0.0", "1.0.0-01"])
    await expect(rolloutSmoke({ ...options, version })).rejects.toThrow(
      "Invalid semver",
    );
  await expect(
    rolloutSmoke({ ...options, timeoutMs: Number.NaN }),
  ).rejects.toThrow("durations");
  expect(request).not.toHaveBeenCalled();
});

test.each([
  "1.0.0+",
  "1.0.0+build..1",
  "1.0.0+build+1",
  "1.0.0+build_1",
  "1.0.0-",
  "1.0.0-alpha..1",
  "1.0.0-alpha_1",
  "1.0.0-01+build",
  "01.0.0",
  "1.0.0\n",
  "1.0.0-alpha\n",
])("rejects semver identifier boundary case %s", (version) => {
  expect(() => compareVersions(version, "1.0.0")).toThrow(
    `Invalid semver: ${version}`,
  );
});

test.each([
  ["1.0.0+001", "1.0.0", 0],
  ["1.0.0-alpha-beta+build-1.001", "1.0.0-alpha-beta", 0],
  ["1.0.0-alpha.0", "1.0.0-alpha.1", -1],
  ["1.0.0-alpha.1", "1.0.0-alpha", 1],
  ["1.0.0-alpha", "1.0.0-beta", -1],
] as const)("preserves semver ordering for %s and %s", (a, b, order) => {
  expect(compareVersions(a, b)).toBe(order);
});
