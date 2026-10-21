import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";
import * as Sentry from "@sentry/node";
import { DrizzleQueryError } from "drizzle-orm/errors";
import { errorConfig } from "./telemetry/config.ts";
import { safePath, scrubTelemetry, scrubText } from "./telemetry/scrub.ts";

test("privacy scrubber handles 100 KB adversarial inputs in under 50 ms each", (t) => {
  const inputs = [
    "a".repeat(100_000),
    "/".repeat(100_000),
    `${"a".repeat(100_000)}@example.com`,
    `${"a".repeat(100_000)}!`,
    `${"token ".repeat(16_667)}=private`,
    `token="${"a".repeat(100_000)}`,
  ];
  for (const input of inputs) {
    const start = performance.now();
    const text = scrubText(input);
    const path = safePath(`/${input}`);
    const elapsed = performance.now() - start;
    t.diagnostic(`${input.length} characters: ${elapsed.toFixed(2)} ms`);
    assert.ok(elapsed < 50, `Scrubbing took ${elapsed.toFixed(2)} ms`);
    assert.ok(text.length <= 2_000);
    assert.doesNotMatch(text, /@example\.com|private/);
    assert.doesNotMatch(path, /@example\.com/);
  }
});

test("privacy scrubber parses sensitive assignments without leaking quoted or malformed values", () => {
  assert.equal(
    scrubText(
      "token=one obsSecret: \"two words\" password=three&email=four code='five six'",
    ),
    "token=[redacted] obsSecret: [redacted] password=[redacted]&email=[redacted] code=[redacted]",
  );
  assert.equal(scrubText('token="unterminated'), "token=[redacted]");
  assert.equal(scrubText("moddrop@telemetry-test"), "moddrop@telemetry-test");
  assert.equal(scrubText("person%40example.com"), "[redacted]");
  assert.equal(
    scrubText("custom-email=seven auth-authorization=eight"),
    "custom-email=[redacted] auth-authorization=[redacted]",
  );
  assert.equal(scrubText("/api/path?token=private#fragment"), "/api/path");
  assert.equal(
    safePath("/profile/person%40example.com"),
    "/profile/[redacted]",
  );
});

test("unhandled backend rejections flush exactly one event and exit non-zero", async (t) => {
  const envelopes: string[] = [];
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    envelopes.push(Buffer.concat(chunks).toString());
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end("{}");
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const child = spawn(
    process.execPath,
    [
      "--import",
      "./src/telemetry.ts",
      "--input-type=module",
      "-e",
      'Promise.reject(new Error("synthetic unhandled rejection"));',
    ],
    {
      cwd: new URL("..", import.meta.url),
      env: {
        PATH: process.env.PATH,
        GLITCHTIP_DSN: `http://public@127.0.0.1:${address.port}/10`,
        GLITCHTIP_TRACES_SAMPLE_RATE: "0",
      },
      stdio: "ignore",
    },
  );
  const timeout = setTimeout(() => child.kill("SIGKILL"), 8_000);
  t.after(() => clearTimeout(timeout));
  const [code, signal] = await once(child, "exit");
  assert.equal(signal, null);
  assert.notEqual(code, 0);
  const events = envelopes.flatMap((envelope) =>
    envelope.split("\n").filter((line) => line.includes('"type":"event"')),
  );
  assert.equal(events.length, 1);
  assert.match(envelopes.join("\n"), /synthetic unhandled rejection/);
});

test("Drizzle query errors redact all SQL parameters", () => {
  const error = new DrizzleQueryError("insert into users values ($1, $2)", [
    "user_x",
    "beasty",
  ]);
  assert.equal(
    scrubText(error.message),
    "Failed query: insert into users values ($1, $2)\nparams: [redacted]",
  );
});

test("Hono request errors retain stderr logs and send exactly one error event", async (t) => {
  const { app } = await import("./app.ts");
  const { closeDatabase } = await import("./db.ts");
  const { leaderState } = await import("./leader.ts");
  leaderState.isLeader = true;
  t.after(async () => {
    leaderState.isLeader = false;
    await Sentry.close();
    await closeDatabase();
  });
  const events: unknown[] = [];
  Sentry.init({
    dsn: "https://public@errors.invalid/10",
    sendClientReports: false,
    beforeSend: scrubTelemetry,
    beforeBreadcrumb: scrubTelemetry,
    integrations: [Sentry.captureConsoleIntegration({ levels: ["error"] })],
    transport: () => ({
      send: async (envelope) => {
        for (const [header, payload] of envelope[1]) {
          if (header.type === "event") events.push(payload);
        }
        return { statusCode: 200 };
      },
      flush: async () => true,
    }),
  });
  const stderr = t.mock.method(process.stderr, "write", () => true);
  app.get("/telemetry-test-error", () => {
    throw new Error("synthetic request failure");
  });
  const response = await app.request("/telemetry-test-error");
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Internal server error" });
  await Sentry.flush(2_000);
  assert.match(
    stderr.mock.calls.map((call) => String(call.arguments[0])).join(""),
    /\[stream-canvas\] request failed.*Error: synthetic request failure/s,
  );
  assert.equal(events.length, 1);
  assert.match(JSON.stringify(events[0]), /synthetic request failure/);
});

test("error reporting is off without a valid DSN", () => {
  assert.equal(errorConfig({}).dsn, undefined);
  assert.equal(errorConfig({ GLITCHTIP_DSN: "not-a-dsn" }).dsn, undefined);
});
test("release and environment are shared, with bounded trace sampling", () => {
  const config = errorConfig({
    GLITCHTIP_DSN: "https://public@errors.invalid/10",
    APP_RELEASE: "moddrop@1.0.0",
    GLITCHTIP_ENVIRONMENT: "test",
    GLITCHTIP_TRACES_SAMPLE_RATE: "0.01",
  });
  assert.equal(config.release, "moddrop@1.0.0");
  assert.equal(config.environment, "test");
  assert.equal(config.tracesSampleRate, 0.01);
  assert.equal(
    errorConfig({ GLITCHTIP_TRACES_SAMPLE_RATE: "NaN" }).tracesSampleRate,
    0.05,
  );
});
test("server events and breadcrumbs remove request credentials and PII", () => {
  const sent: unknown[] = [];
  const fakeTransport = (event: unknown) => sent.push(scrubTelemetry(event));
  fakeTransport({
    request: {
      url: "https://canvas.invalid/ws?token=synthetic-token",
      headers: { authorization: "Bearer synthetic-token" },
      data: { secret: "synthetic-secret" },
    },
    user: { email: "person@example.com" },
    exception: {
      values: [
        { value: "Failed for person@example.com token=synthetic-token" },
      ],
    },
    breadcrumbs: [
      {
        data: { url: "private" },
        message: "https://canvas.invalid/obs#secret=synthetic-secret",
      },
    ],
  });
  assert.doesNotMatch(
    JSON.stringify(sent),
    /person@|synthetic-token|synthetic-secret|Bearer/,
  );
  assert.match(JSON.stringify(sent), /\/ws/);
});
