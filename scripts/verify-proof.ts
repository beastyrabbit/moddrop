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
  workflowBlob: (ref: string) => Promise<string>;
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

export async function canReuseVerify(
  api: ProofApi,
  repository: string,
  tree: string,
  workflowBlob: string,
  now = Date.now(),
  report: Report = () => {},
): Promise<boolean> {
  const fallback = (reason: string, level: "notice" | "warning" = "notice") => {
    report(reason, level);
    return false;
  };
  let reason = "no artifact named for this tree";
  let operation = "API artifact lookup";
  try {
    if (!sha.test(tree)) return fallback("invalid release tree");
    if (!sha.test(workflowBlob))
      return fallback("invalid release workflow blob");
    const name = `verify-proof-${tree}`;
    for (let page = 1; ; page++) {
      operation = "API artifact lookup";
      const artifacts = await api.artifacts(name, page);
      for (const artifact of artifacts) {
        if (
          artifact.name !== name ||
          artifact.expired ||
          !(Date.parse(artifact.expires_at) > now) ||
          !artifact.workflow_run
        ) {
          if (artifact.name === name)
            reason =
              artifact.expired || !(Date.parse(artifact.expires_at) > now)
                ? "artifact expired or invalid expiry"
                : "artifact has no workflow run";
          continue;
        }
        operation = "API run lookup";
        const run = await api.run(artifact.workflow_run.id);
        if (
          run.path !== ".github/workflows/verify.yml" ||
          run.status !== "completed" ||
          run.conclusion !== "success" ||
          run.head_repository?.full_name !== repository
        ) {
          reason =
            run.path !== ".github/workflows/verify.yml"
              ? "wrong workflow path"
              : run.status !== "completed" || run.conclusion !== "success"
                ? "run not successful/completed"
                : "foreign head repository";
          continue;
        }
        if (!sha.test(run.head_sha)) {
          reason = "invalid run head SHA";
          continue;
        }
        operation = "API workflow blob lookup";
        const runWorkflowBlob = await api.workflowBlob(run.head_sha);
        if (!sha.test(runWorkflowBlob)) {
          reason = "invalid verify workflow blob";
          continue;
        }
        if (runWorkflowBlob !== workflowBlob) {
          reason = "verify workflow differs from release";
          continue;
        }
        operation = "artifact download";
        const contents = await api.download(artifact.id);
        operation = "proof parsing";
        const proof: unknown = JSON.parse(contents);
        if (
          proof !== null &&
          typeof proof === "object" &&
          "tree" in proof &&
          typeof proof.tree === "string" &&
          sha.test(proof.tree) &&
          proof.tree === tree &&
          "commit" in proof &&
          typeof proof.commit === "string" &&
          sha.test(proof.commit)
        )
          return true;
        reason =
          proof !== null &&
          typeof proof === "object" &&
          "tree" in proof &&
          typeof proof.tree === "string" &&
          sha.test(proof.tree) &&
          proof.tree !== tree
            ? "tree mismatch"
            : "malformed proof";
      }
      if (artifacts.length < 100) return fallback(reason);
    }
  } catch (error) {
    // An unavailable API, invalid archive or malformed proof requires full verify.
    if (operation === "proof parsing") return fallback("malformed proof");
    return fallback(
      error instanceof ProofLookupError
        ? error.message
        : `${operation} failed (${errorClass(error)})`,
      "warning",
    );
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
    async workflowBlob(ref) {
      const response = await request(
        `/contents/.github/workflows/verify.yml?ref=${encodeURIComponent(ref)}`,
      );
      return (await response.json()).sha;
    },
    async download(id) {
      const response = await request(`/actions/artifacts/${id}/zip`);
      const directory = mkdtempSync(join(tmpdir(), "verify-proof-"));
      try {
        const archive = join(directory, "proof.zip");
        writeFileSync(archive, Buffer.from(await response.arrayBuffer()));
        // Read one fixed member as data. Never extract paths or execute archive contents.
        try {
          return execFileSync("unzip", ["-p", archive, "verify-proof.json"], {
            encoding: "utf8",
            timeout: 5_000,
            maxBuffer: 16_384,
            stdio: ["ignore", "pipe", "ignore"],
          });
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
      "git",
      ["rev-parse", `${process.env.GITHUB_SHA}^{tree}`],
      { encoding: "utf8", timeout: 5_000 },
    ).trim();
    const workflowBlob = execFileSync(
      "git",
      ["rev-parse", `${process.env.GITHUB_SHA}:.github/workflows/verify.yml`],
      { encoding: "utf8", timeout: 5_000 },
    ).trim();
    const repository = process.env.GITHUB_REPOSITORY;
    const token = process.env.GH_TOKEN;
    if (repository && token)
      reuse = await canReuseVerify(
        githubProofApi(repository, token, process.env.GITHUB_API_URL),
        repository,
        tree,
        workflowBlob,
        Date.now(),
        report,
      );
    else report("missing GitHub repository or token", "warning");
  } catch (error) {
    // Checkout or git failures also fall back to the existing workflow.
    report(
      `checkout tree or workflow lookup failed (${errorClass(error)})`,
      "warning",
    );
  }
  if (reuse) console.log("Reusing successful Verify tree proof.");
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, `reuse=${reuse}\n`);
}
