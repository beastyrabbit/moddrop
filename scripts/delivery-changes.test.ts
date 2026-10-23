import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { parse } from "yaml";

test("GitHub releases use the PR verification gate before production actions", () => {
  const workflow = parse(
    readFileSync(".github/workflows/build-images.yml", "utf8"),
  );
  const verification = parse(
    readFileSync(".github/workflows/verify.yml", "utf8"),
  );
  expect(workflow.jobs.verify.uses).toBe("./.github/workflows/verify.yml");
  expect(verification.on).toHaveProperty("pull_request");
  expect(verification.on).toHaveProperty("workflow_call");
  expect(verification.jobs.verify["runs-on"]).toBe("arc-moddrop");
  const job = workflow.jobs.build;
  expect(job.needs).toEqual(["gate", "verify"]);
  expect(workflow.jobs.verify.needs).toBe("gate");
  expect(workflow.jobs.smoke.needs).toBe("build");
  expect(workflow.jobs.gate.permissions).toEqual({
    actions: "read",
    contents: "read",
  });
  expect(verification.jobs.verify.services.postgres).toBeDefined();
  const steps = verification.jobs.verify.steps;
  const verifyIndex = steps.findIndex(
    (step: { run?: string }) => step.run === "bash scripts/verify.sh",
  );
  expect(verifyIndex).toBeGreaterThan(-1);
  expect(steps.at(-1).uses).toBe("actions/upload-artifact@v7");
  expect(steps.at(-1).with.path).toBe("verify-proof.json");
  expect(steps.at(-1).with.overwrite).toBe(true);
  expect(steps.at(-1).with.archive).toBeUndefined(); // v7 defaults to a ZIP.
  for (const step of steps.slice(verifyIndex + 1))
    expect(step.if).toBeUndefined(); // Default success() protects the proof.

  const results = ["success", "failure", "cancelled", "skipped"];
  for (const gate of results)
    for (const reuse of ["true", "false", ""])
      for (const verify of results)
        for (const cancelled of [true, false])
          for (const ref of [
            "refs/heads/feature",
            "refs/heads/main",
            "refs/tags/v0.6.2",
            "refs/tags/other",
            "refs/pull/1/merge",
          ]) {
            const needs = {
              gate: { result: gate, outputs: { reuse } },
              verify: { result: verify },
            };
            const evaluate = (
              condition: string,
              dependencies: object = needs,
            ) =>
              Function(
                "needs",
                "github",
                "cancelled",
                "always",
                "startsWith",
                `return (${condition});`,
              )(
                dependencies,
                { ref },
                () => cancelled,
                () => true,
                (value: string, prefix: string) => value.startsWith(prefix),
              );
            expect(evaluate(workflow.jobs.gate.if)).toBe(!cancelled);
            expect(evaluate(workflow.jobs.verify.if)).toBe(
              !cancelled && (gate !== "success" || reuse !== "true"),
            );
            const safe =
              !cancelled &&
              (ref === "refs/heads/main" || ref.startsWith("refs/tags/v")) &&
              (verify === "success" ||
                (gate === "success" &&
                  reuse === "true" &&
                  verify === "skipped"));
            expect(evaluate(job.if)).toBe(safe);
            for (const build of results)
              expect(
                evaluate(workflow.jobs.smoke.if, { build: { result: build } }),
              ).toBe(
                !cancelled &&
                  build === "success" &&
                  ref.startsWith("refs/tags/v"),
              );
          }
});

test.each(["pnpm-lock.yaml", "pnpm-workspace.yaml", "package.json", ".npmrc"])(
  "shared install input %s rebuilds both images",
  (path) => {
    const output = execFileSync("bash", ["scripts/delivery-changes.sh"], {
      input: path,
      encoding: "utf8",
    });
    expect(output).toContain("frontend=true");
    expect(output).toContain("stream_canvas=true");
  },
);

test("delivery requires successful verification outside pull requests", () => {
  const workflow = parse(
    readFileSync(".forgejo/workflows/build-images.yml", "utf8"),
  ) as {
    jobs: Record<string, { needs?: string[]; if?: string }>;
  };
  for (const name of ["build-frontend", "build-stream-canvas"]) {
    const job = workflow.jobs[name];
    expect(job.needs).toContain("verify");
    const condition = job.if ?? "";
    const evaluate = (
      result: string,
      ref: string,
      event = "workflow_dispatch",
    ) => {
      const needs = {
        verify: { result },
        changes: { outputs: {} },
      };
      const github = {
        ref,
        event_name: event,
        event: {
          inputs: {
            build_frontend: "true",
            build_stream_canvas: "true",
          },
        },
      };
      return Function(
        "needs",
        "github",
        "always",
        "startsWith",
        `return (${condition});`,
      )(
        needs,
        github,
        () => true,
        (a: string, b: string) => a.startsWith(b),
      );
    };
    for (const result of ["failure", "cancelled", "skipped"])
      expect(evaluate(result, "refs/heads/main")).toBe(false);
    expect(evaluate("success", "refs/heads/main", "pull_request")).toBe(false);
    expect(evaluate("success", "refs/heads/main")).toBe(true);
  }
});

test.each([
  ["instrumentation.ts", false],
  ["instrumentation-client.ts", false],
  ["backend/stream-canvas/src/telemetry/config.ts", true],
  ["backend/stream-canvas/src/telemetry/scrub.ts", true],
  ["backend/stream-canvas/src/telemetry/nested/helper.ts", true],
] as const)(
  "frontend telemetry input %s rebuilds the frontend",
  (path, backend) => {
    const output = execFileSync("bash", ["scripts/delivery-changes.sh"], {
      input: path,
      encoding: "utf8",
    });
    expect(output).toContain("frontend=true");
    expect(output).toContain(`stream_canvas=${backend}`);
  },
);

test.each([
  "scripts/upload-sourcemaps.mjs",
  "scripts/sourcemap-guard.ts",
  "docker-entrypoint.sh",
])("frontend image script %s rebuilds only the frontend", (path) => {
  const output = execFileSync("bash", ["scripts/delivery-changes.sh"], {
    input: path,
    encoding: "utf8",
  });
  expect(output).toContain("frontend=true");
  expect(output).toContain("stream_canvas=false");
});

test.each([
  "docs/telemetry.md",
  "backend/stream-canvas/src/telemetry.ts",
  "backend/stream-canvas/src/server.ts",
  "instrumentation-client.ts.bak",
  "scripts/upload-sourcemaps.mjs.bak",
  "scripts/sourcemap-guard.test.ts",
])("unrelated input %s does not rebuild the frontend", (path) => {
  const output = execFileSync("bash", ["scripts/delivery-changes.sh"], {
    input: path,
    encoding: "utf8",
  });
  expect(output).toContain("frontend=false");
});
