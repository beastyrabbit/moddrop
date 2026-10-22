import { expect, test, vi } from "vitest";
import { canReuseVerify, type ProofApi } from "./verify-proof";

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
    path: ".github/workflows/verify.yml",
    status: "completed",
    conclusion: "success",
    head_repository: { full_name: repository },
  };
  const api = {
    artifacts: vi.fn<ProofApi["artifacts"]>(async () => [artifact]),
    run: vi.fn<ProofApi["run"]>(async () => run),
    download: vi.fn(async () => JSON.stringify({ tree, commit })),
  } satisfies ProofApi;
  return { artifact, run, api };
}

test("accepts matching tree from a successful same-repository Verify run, regardless of commit", async () => {
  const { api } = fixture();
  expect(await canReuseVerify(api, repository, tree)).toBe(true);
  expect(api.artifacts).toHaveBeenCalledWith(`verify-proof-${tree}`, 1);
  expect(api.run).toHaveBeenCalledWith(2);
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
  expect(api.download).not.toHaveBeenCalled();
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
  for (const method of [api.artifacts, api.run, api.download]) {
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
