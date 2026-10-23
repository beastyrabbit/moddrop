import { execFileSync } from "node:child_process";
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

type Artifact = {
  id: number;
  name: string;
  expired: boolean;
  expires_at: string;
  workflow_run?: { id: number };
};
type Run = {
  head_sha: string;
  path: string;
  status: string;
  conclusion: string | null;
  head_repository: { full_name: string } | null;
};
export type ProofApi = {
  artifacts: (name: string, page: number) => Promise<Artifact[]>;
  run: (id: number) => Promise<Run>;
  commitTree: (sha: string) => Promise<string>;
  download: (id: number) => Promise<string>;
};
const sha = /^[0-9a-f]{40}$/;
type Report = (reason: string, level: "notice" | "warning") => void;

class ProofLookupError extends Error {}

function errorClass(error: unknown) {
  if (error instanceof TypeError) return "TypeError";
  if (error instanceof SyntaxError) return "SyntaxError";
  if (error instanceof DOMException) return "DOMException";
  return error instanceof Error ? "Error" : "unknown error";
}

function artifactProblem(artifact: Artifact, now: number): string | null {
  if (artifact.expired) return "artifact expired or invalid expiry";
  const expires = Date.parse(artifact.expires_at);
  if (!Number.isFinite(expires) || expires <= now)
    return "artifact expired or invalid expiry";
  return null;
}

function runProblem(run: Run, repository: string): string | null {
  if (run.path !== ".github/workflows/verify.yml") return "wrong workflow path";
  if (run.status !== "completed" || run.conclusion !== "success")
    return "run not successful/completed";
  if (run.head_repository?.full_name !== repository)
    return "foreign head repository";
  if (!sha.test(run.head_sha)) return "invalid run head SHA";
  return null;
}

function runTreeProblem(runHeadTree: string, tree: string): string | null {
  if (!sha.test(runHeadTree)) return "invalid run head tree";
  if (runHeadTree !== tree) return "run head tree differs from release";
  return null;
}

function proofProblem(proof: unknown, tree: string): string | null {
  if (
    proof === null ||
    typeof proof !== "object" ||
    !("tree" in proof) ||
    typeof proof.tree !== "string" ||
    !sha.test(proof.tree)
  )
    return "malformed proof";
  if (proof.tree !== tree) return "tree mismatch";
  if (
    !("commit" in proof) ||
    typeof proof.commit !== "string" ||
    !sha.test(proof.commit)
  )
    return "malformed proof";
  return null;
}

function lookupFailure(
  error: unknown,
  operation: string,
): [string, "notice" | "warning"] {
  if (operation === "proof parsing") return ["malformed proof", "notice"];
  return [
    error instanceof ProofLookupError
      ? error.message
      : `${operation} failed (${errorClass(error)})`,
    "warning",
  ];
}

export async function canReuseVerify(
  api: ProofApi,
  repository: string,
  tree: string,
  now = Date.now(),
  report: Report = () => {},
): Promise<boolean> {
  const fallback = (reason: string, level: "notice" | "warning" = "notice") => {
    report(reason, level);
    return false;
  };
  let reason = "no artifact named for this tree";
  let operation = "API artifact lookup";
  async function checkArtifact(artifact: Artifact): Promise<string | null> {
    const artifactReason = artifactProblem(artifact, now);
    if (artifactReason) return artifactReason;
    if (!artifact.workflow_run) return "artifact has no workflow run";
    operation = "API run lookup";
    const run = await api.run(artifact.workflow_run.id);
    const runReason = runProblem(run, repository);
    if (runReason) return runReason;
    // Artifacts are only an index: any job in a run can forge their claims.
    // GitHub binds the run head to its tree, whose verify.sh/verify.yml ran.
    // PR merge refs add only trusted main changes. Cheating code must come
    // from this tree, which a fallback verify would also execute.
    operation = "API commit tree lookup";
    const runHeadTree = await api.commitTree(run.head_sha);
    const treeReason = runTreeProblem(runHeadTree, tree);
    if (treeReason) return treeReason;
    operation = "artifact download";
    const contents = await api.download(artifact.id);
    operation = "proof parsing";
    const proof: unknown = JSON.parse(contents);
    return proofProblem(proof, tree);
  }
  try {
    if (!sha.test(tree)) return fallback("invalid release tree");
    const name = `verify-proof-${tree}`;
    for (let page = 1; ; page++) {
      operation = "API artifact lookup";
      const artifacts = await api.artifacts(name, page);
      for (const artifact of artifacts) {
        if (artifact.name !== name) continue;
        const problem = await checkArtifact(artifact);
        if (problem === null) return true;
        reason = problem;
      }
      if (artifacts.length < 100) return fallback(reason);
    }
  } catch (error) {
    // An unavailable API, invalid archive or malformed proof requires full verify.
    return fallback(...lookupFailure(error, operation));
  }
}

export function githubProofApi(
  repository: string,
  token: string,
  apiUrl = "https://api.github.com",
): ProofApi {
  const root = `${apiUrl}/repos/${repository}`;
  async function request(path: string) {
    const response = await fetch(`${root}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok)
      throw new ProofLookupError(`GitHub proof API HTTP ${response.status}`);
    return response;
  }
  return {
    async artifacts(name, page) {
      const response = await request(
        `/actions/artifacts?name=${encodeURIComponent(name)}&per_page=100&page=${page}`,
      );
      return (await response.json()).artifacts;
    },
    async run(id) {
      return (await request(`/actions/runs/${id}`)).json();
    },
    async commitTree(sha) {
      const response = await request(`/git/commits/${encodeURIComponent(sha)}`);
      return (await response.json()).tree.sha;
    },
    async download(id) {
      const response = await request(`/actions/artifacts/${id}/zip`);
      const directory = mkdtempSync(join(tmpdir(), "verify-proof-"));
      try {
        const archive = join(directory, "proof.zip");
        writeFileSync(archive, Buffer.from(await response.arrayBuffer()));
        // Read one fixed member as data. Never extract paths or execute archive contents.
        try {
          return execFileSync(
            "/usr/bin/unzip",
            ["-p", archive, "verify-proof.json"],
            {
              encoding: "utf8",
              timeout: 5_000,
              maxBuffer: 16_384,
              stdio: ["ignore", "pipe", "ignore"],
            },
          );
        } catch (error) {
          throw new ProofLookupError(
            error instanceof Error && "code" in error && error.code === "ENOENT"
              ? "unzip not available on runner (ENOENT)"
              : `artifact unzip failed (${errorClass(error)})`,
          );
        }
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  };
}

if (import.meta.main) {
  let reuse = false;
  const report: Report = (reason, level) =>
    console.log(`::${level}::Full Verify required: ${reason}.`);
  try {
    const tree = execFileSync(
      "/usr/bin/git",
      ["rev-parse", `${process.env.GITHUB_SHA}^{tree}`],
      { encoding: "utf8", timeout: 5_000 },
    ).trim();
    const repository = process.env.GITHUB_REPOSITORY;
    const token = process.env.GH_TOKEN;
    if (repository && token)
      reuse = await canReuseVerify(
        githubProofApi(repository, token, process.env.GITHUB_API_URL),
        repository,
        tree,
        Date.now(),
        report,
      );
    else report("missing GitHub repository or token", "warning");
  } catch (error) {
    // Checkout or git failures also fall back to the existing workflow.
    report(`checkout tree lookup failed (${errorClass(error)})`, "warning");
  }
  if (reuse) console.log("Reusing successful Verify tree proof.");
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, `reuse=${reuse}\n`);
}
