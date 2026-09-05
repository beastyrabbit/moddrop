import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parse } from "yaml";
import { expect, test } from "vitest";

test.each(["pnpm-lock.yaml", "pnpm-workspace.yaml", "package.json", ".npmrc"])(
  "shared install input %s rebuilds both images and Convex",
  (path) => {
    const output = execFileSync("bash", ["scripts/delivery-changes.sh"], {
      input: path,
      encoding: "utf8",
    });
    expect(output).toContain("frontend=true");
    expect(output).toContain("stream_canvas=true");
    expect(output).toContain("convex=true");
  },
);

test("first release succeeds without a previous tag; subsequent unchanged release skips Convex", () => {
  const directory = mkdtempSync(join(tmpdir(), "canvas-delivery-"));
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: directory,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  try {
    git("init");
    git("config", "user.name", "Fixture");
    git("config", "user.email", "fixture@example.invalid");
    writeFileSync(join(directory, "README.md"), "fixture\n");
    git("add", "README.md");
    git("commit", "-m", "fixture");
    git("tag", "v0.1.0");
    const run = (tag: string) =>
      execFileSync("bash", [resolve("scripts/delivery-changes.sh"), "tag"], {
        cwd: directory,
        encoding: "utf8",
        env: {
          ...process.env,
          CURRENT_TAG: tag,
          CURRENT_SHA: git("rev-parse", "HEAD"),
        },
      });
    expect(run("v0.1.0")).toBe("convex=true\n");
    git("tag", "v0.2.0");
    expect(run("v0.2.0")).toBe("convex=false\n");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("delivery requires successful verification and manual Convex deployment is restricted to main", () => {
  const workflow = parse(
    readFileSync(".forgejo/workflows/build-images.yml", "utf8"),
  ) as {
    jobs: Record<string, { needs?: string[]; if?: string }>;
  };
  for (const name of [
    "deploy-convex",
    "build-frontend",
    "build-stream-canvas",
  ]) {
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
        "tag-convex-changes": { outputs: {} },
      };
      const github = {
        ref,
        event_name: event,
        event: {
          inputs: {
            deploy_convex: "true",
            build_frontend: "true",
            build_stream_canvas: "true",
          },
        },
      };
      const expression = condition.replaceAll(
        "needs.tag-convex-changes",
        'needs["tag-convex-changes"]',
      );
      return Function(
        "needs",
        "github",
        "always",
        "startsWith",
        `return (${expression});`,
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
    if (name === "deploy-convex") {
      expect(evaluate("success", "refs/heads/feature")).toBe(false);
      expect(evaluate("success", "refs/tags/v1.0.0")).toBe(false);
    }
  }
});
