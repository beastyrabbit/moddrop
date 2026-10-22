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
  path: string;
  status: string;
  conclusion: string | null;
  head_repository: { full_name: string } | null;
};
export type ProofApi = {
  artifacts: (name: string, page: number) => Promise<Artifact[]>;
  run: (id: number) => Promise<Run>;
  download: (id: number) => Promise<string>;
};
const sha = /^[0-9a-f]{40}$/;

export async function canReuseVerify(
  api: ProofApi,
  repository: string,
  tree: string,
  now = Date.now(),
): Promise<boolean> {
  try {
    if (!sha.test(tree)) return false;
    const name = `verify-proof-${tree}`;
    for (let page = 1; ; page++) {
      const artifacts = await api.artifacts(name, page);
      for (const artifact of artifacts) {
        if (
          artifact.name !== name ||
          artifact.expired ||
          !(Date.parse(artifact.expires_at) > now) ||
          !artifact.workflow_run
        )
          continue;
        const run = await api.run(artifact.workflow_run.id);
        if (
          run.path !== ".github/workflows/verify.yml" ||
          run.status !== "completed" ||
          run.conclusion !== "success" ||
          run.head_repository?.full_name !== repository
        )
          continue;
        const proof: unknown = JSON.parse(await api.download(artifact.id));
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
      }
      if (artifacts.length < 100) return false;
    }
  } catch {
    // An unavailable API, invalid archive or malformed proof requires full verify.
    return false;
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
    if (!response.ok) throw new Error("GitHub proof lookup failed");
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
    async download(id) {
      const response = await request(`/actions/artifacts/${id}/zip`);
      const directory = mkdtempSync(join(tmpdir(), "verify-proof-"));
      try {
        const archive = join(directory, "proof.zip");
        writeFileSync(archive, Buffer.from(await response.arrayBuffer()));
        // Read one fixed member as data. Never extract paths or execute archive contents.
        return execFileSync("unzip", ["-p", archive, "verify-proof.json"], {
          encoding: "utf8",
          timeout: 5_000,
          maxBuffer: 16_384,
          stdio: ["ignore", "pipe", "ignore"],
        });
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  };
}

if (import.meta.main) {
  let reuse = false;
  try {
    const tree = execFileSync(
      "git",
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
      );
  } catch {
    // Checkout or git failures also fall back to the existing workflow.
  }
  console.log(
    reuse ? "Reusing successful Verify tree proof." : "Full Verify required.",
  );
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, `reuse=${reuse}\n`);
}
