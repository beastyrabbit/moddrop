import { execFileSync } from "node:child_process";
import { afterEach, expect, test, vi } from "vitest";
import { canReuseVerify, githubProofApi, type ProofApi } from "./verify-proof";

vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(execFileSync).mockReset();
});

const tree = "a".repeat(40);
const commit = "b".repeat(40);
const repository = "owner/moddrop";
function fixture() {
  const artifact: Awaited<ReturnType<ProofApi["artifacts"]>>[number] = {
    id: 1,
    name: `verify-proof-${tree}`,
    expired: false,
    expires_at: "2099-01-01T00:00:00Z",
    workflow_run: { id: 2 },
  };
  const run: Awaited<ReturnType<ProofApi["run"]>> = {
    head_sha: commit,
    path: ".github/workflows/verify.yml",
    status: "completed",
    conclusion: "success",
    head_repository: { full_name: repository },
  };
  const api = {
    artifacts: vi.fn<ProofApi["artifacts"]>(async () => [artifact]),
    run: vi.fn<ProofApi["run"]>(async () => run),
    commitTree: vi.fn<ProofApi["commitTree"]>(async () => tree),
    download: vi.fn(async () => JSON.stringify({ tree, commit })),
  } satisfies ProofApi;
  return { artifact, run, api };
}

test("accepts matching artifact and run head trees from a successful same-repository Verify run, regardless of commit", async () => {
  const { api } = fixture();
  expect(await canReuseVerify(api, repository, tree)).toBe(true);
  expect(api.artifacts).toHaveBeenCalledWith(`verify-proof-${tree}`, 1);
  expect(api.run).toHaveBeenCalledWith(2);
  expect(api.commitTree).toHaveBeenCalledWith(commit);
  expect(api.download).toHaveBeenCalledWith(1);
});

test.each([
  { path: ".github/workflows/build-images.yml" },
  { status: "in_progress" },
  { conclusion: "failure" },
  { conclusion: "cancelled" },
  { conclusion: "skipped" },
  { head_repository: { full_name: "fork/moddrop" } },
  { head_repository: null },
])("rejects untrusted/unsuccessful run %j", async (override) => {
  const { api, run } = fixture();
  api.run.mockResolvedValue({ ...run, ...override });
  expect(await canReuseVerify(api, repository, tree)).toBe(false);
  expect(api.commitTree).not.toHaveBeenCalled();
  expect(api.download).not.toHaveBeenCalled();
});

test("rejects a valid artifact claiming the release tree when the run head tree differs before downloading proof", async () => {
  const { api } = fixture();
  const report = vi.fn();
  api.commitTree.mockResolvedValue("e".repeat(40));
  expect(await canReuseVerify(api, repository, tree, Date.now(), report)).toBe(
    false,
  );
  expect(report).toHaveBeenCalledExactlyOnceWith(
    "run head tree differs from release",
    "notice",
  );
  expect(api.download).not.toHaveBeenCalled();
});

test.each(["invalid", "x".repeat(40), "a".repeat(39), "a".repeat(41)])(
  "rejects invalid run head SHA %s before looking up the commit tree",
  async (head_sha) => {
    const { api, run } = fixture();
    const report = vi.fn();
    run.head_sha = head_sha;
    expect(
      await canReuseVerify(api, repository, tree, Date.now(), report),
    ).toBe(false);
    expect(report).toHaveBeenCalledExactlyOnceWith(
      "invalid run head SHA",
      "notice",
    );
    expect(api.commitTree).not.toHaveBeenCalled();
    expect(api.download).not.toHaveBeenCalled();
  },
);

test.each(["invalid", "x".repeat(40), "a".repeat(39), "a".repeat(41)])(
  "rejects invalid run head tree %s before downloading proof",
  async (invalidTree) => {
    const { api } = fixture();
    const report = vi.fn();
    api.commitTree.mockResolvedValue(invalidTree);
    expect(
      await canReuseVerify(api, repository, tree, Date.now(), report),
    ).toBe(false);
    expect(report).toHaveBeenCalledExactlyOnceWith(
      "invalid run head tree",
      "notice",
    );
    expect(api.download).not.toHaveBeenCalled();
  },
);

test("reports a commit tree API error as a warning before downloading proof", async () => {
  const { api } = fixture();
  const report = vi.fn();
  api.commitTree.mockRejectedValue(new TypeError("private diagnostic"));
  expect(await canReuseVerify(api, repository, tree, Date.now(), report)).toBe(
    false,
  );
  expect(report).toHaveBeenCalledExactlyOnceWith(
    "API commit tree lookup failed (TypeError)",
    "warning",
  );
  expect(api.download).not.toHaveBeenCalled();
});

test("looks up the run head commit tree using the Git commits API", async () => {
  const fetch = vi.fn(async () => Response.json({ tree: { sha: tree } }));
  vi.stubGlobal("fetch", fetch);
  expect(
    await githubProofApi(
      repository,
      "fixture-token",
      "https://fixture.invalid",
    ).commitTree(commit),
  ).toBe(tree);
  expect(fetch).toHaveBeenCalledExactlyOnceWith(
    `https://fixture.invalid/repos/${repository}/git/commits/${commit}`,
    expect.any(Object),
  );
});

test.each([
  { expired: true },
  { expires_at: "2000-01-01T00:00:00Z" },
  { expires_at: "invalid" },
  { name: "verify-proof-other" },
  { workflow_run: undefined },
])("rejects unusable artifact %j", async (override) => {
  const { api, artifact } = fixture();
  api.artifacts.mockResolvedValue([{ ...artifact, ...override }]);
  expect(await canReuseVerify(api, repository, tree)).toBe(false);
});

test.each([
  "not JSON",
  "null",
  "[]",
  JSON.stringify({ tree: "c".repeat(40), commit }),
  JSON.stringify({ tree: "x".repeat(40), commit }),
  JSON.stringify({ tree, commit: "invalid" }),
  JSON.stringify({ tree }),
  "process.exit(0)",
])("parses proof strictly as data and rejects %s", async (body) => {
  const { api } = fixture();
  api.download.mockResolvedValue(body);
  expect(await canReuseVerify(api, repository, tree)).toBe(false);
});

test("missing proof, invalid expected SHA and API/archive errors fall back", async () => {
  const { api } = fixture();
  expect(await canReuseVerify(api, repository, "invalid")).toBe(false);
  api.artifacts.mockResolvedValueOnce([]);
  expect(await canReuseVerify(api, repository, tree)).toBe(false);
  for (const method of [api.artifacts, api.run, api.commitTree, api.download]) {
    method.mockRejectedValueOnce(new Error("unavailable"));
    expect(await canReuseVerify(api, repository, tree)).toBe(false);
  }
});

test("paginates named artifacts until a valid proof is found", async () => {
  const { api, artifact } = fixture();
  api.artifacts.mockResolvedValueOnce(
    Array.from({ length: 100 }, () => ({ ...artifact, expired: true })),
  );
  expect(await canReuseVerify(api, repository, tree)).toBe(true);
  expect(api.artifacts).toHaveBeenLastCalledWith(`verify-proof-${tree}`, 2);
});

test.each([
  "no artifact named for this tree",
  "artifact expired or invalid expiry",
  "run not successful/completed",
  "wrong workflow path",
  "foreign head repository",
  "malformed proof",
  "tree mismatch",
])("reports a concise notice for %s", async (reason) => {
  const { api, artifact, run } = fixture();
  const report = vi.fn();
  switch (reason) {
    case "no artifact named for this tree":
      api.artifacts.mockResolvedValue([]);
      break;
    case "artifact expired or invalid expiry":
      artifact.expired = true;
      break;
    case "run not successful/completed":
      run.conclusion = "failure";
      break;
    case "wrong workflow path":
      run.path = ".github/workflows/build-images.yml";
      break;
    case "foreign head repository":
      run.head_repository = { full_name: "fork/moddrop" };
      break;
    case "malformed proof":
      api.download.mockResolvedValue("not JSON");
      break;
    case "tree mismatch":
      api.download.mockResolvedValue(
        JSON.stringify({ tree: "c".repeat(40), commit }),
      );
      break;
  }
  expect(await canReuseVerify(api, repository, tree, Date.now(), report)).toBe(
    false,
  );
  expect(report).toHaveBeenCalledExactlyOnceWith(reason, "notice");
});

test("reports API errors by class without exposing the error message", async () => {
  const { api } = fixture();
  const report = vi.fn();
  api.artifacts.mockRejectedValue(new TypeError("private diagnostic"));
  expect(await canReuseVerify(api, repository, tree, Date.now(), report)).toBe(
    false,
  );
  expect(report).toHaveBeenCalledExactlyOnceWith(
    "API artifact lookup failed (TypeError)",
    "warning",
  );
});

test.each([401, 403, 404])(
  "reports HTTP %s from API lookup or artifact download without response bodies",
  async (status) => {
    const { artifact, run } = fixture();
    for (const stage of [0, 1, 2, 3]) {
      let calls = 0;
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          if (calls++ === stage)
            return new Response("private response", { status });
          return Response.json(
            calls === 1
              ? { artifacts: [artifact] }
              : calls === 2
                ? run
                : { tree: { sha: tree } },
          );
        }),
      );
      const report = vi.fn();
      expect(
        await canReuseVerify(
          githubProofApi(
            repository,
            "fixture-token",
            "https://fixture.invalid",
          ),
          repository,
          tree,
          Date.now(),
          report,
        ),
      ).toBe(false);
      expect(report).toHaveBeenCalledExactlyOnceWith(
        `GitHub proof API HTTP ${status}`,
        "warning",
      );
    }
  },
);

test.each([
  [
    Object.assign(new Error("private command diagnostic"), { code: "ENOENT" }),
    "unzip not available on runner (ENOENT)",
  ],
  [new Error("private archive diagnostic"), "artifact unzip failed (Error)"],
] as const)("reports unzip failures safely: %j", async (error, reason) => {
  const { artifact, run } = fixture();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(Response.json({ artifacts: [artifact] }))
      .mockResolvedValueOnce(Response.json(run))
      .mockResolvedValueOnce(Response.json({ tree: { sha: tree } }))
      .mockResolvedValueOnce(new Response("fixture archive")),
  );
  vi.mocked(execFileSync).mockImplementation(() => {
    throw error;
  });
  const report = vi.fn();
  expect(
    await canReuseVerify(
      githubProofApi(repository, "fixture-token", "https://fixture.invalid"),
      repository,
      tree,
      Date.now(),
      report,
    ),
  ).toBe(false);
  expect(report).toHaveBeenCalledExactlyOnceWith(reason, "warning");
  expect(execFileSync).toHaveBeenCalledWith(
    "unzip",
    ["-p", expect.any(String), "verify-proof.json"],
    expect.objectContaining({ stdio: ["ignore", "pipe", "ignore"] }),
  );
});
