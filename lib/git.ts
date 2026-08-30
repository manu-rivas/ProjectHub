import { existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { expandHome } from "./paths";

export class GitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitError";
  }
}

export function normalizeRemote(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("-")) return null;
  const ssh = trimmed.match(/^git@([A-Za-z0-9.-]+):([\w./-]+?)(?:\.git)?$/);
  if (ssh) return `https://${ssh[1]}/${ssh[2]}`;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return `${parsed.origin}${parsed.pathname.replace(/\.git$/i, "").replace(/\/$/, "")}`;
  } catch {
    return null;
  }
}

export function remoteKey(url: string): string | null {
  const normalized = normalizeRemote(url);
  return normalized ? normalized.toLowerCase() : null;
}

export function repoFolderName(url: string, fallback = "repo"): string {
  const normalized = normalizeRemote(url) || url;
  const last = normalized.split("/").filter(Boolean).pop() || fallback;
  return last.replace(/\.git$/i, "") || fallback;
}

export function cloneUrl(url: string): string {
  const normalized = normalizeRemote(url);
  if (!normalized) throw new GitError("Invalid Git URL");
  return `${normalized}.git`;
}

export function pickFolder(prompt = "Choose the destination folder"): string {
  if (process.platform !== "darwin") {
    throw new GitError("On this system, type the folder path by hand");
  }
  const result = spawnSync(
    "osascript",
    ["-e", `POSIX path of (choose folder with prompt ${JSON.stringify(prompt)})`],
    { encoding: "utf8", timeout: 300000 },
  );
  if (result.status !== 0) throw new GitError("No folder was chosen");
  return resolve(result.stdout.trim().replace(/\/$/, ""));
}

function isGithubHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "github.com" || host.endsWith(".github.com");
  } catch {
    return false;
  }
}

export function cloneIntoParent(remoteUrl: string, parent: string, folderName?: string): string {
  const parentPath = resolve(expandHome(parent));
  const name = folderName || repoFolderName(remoteUrl);
  if (!name || name === "." || name === ".." || name.includes("/") || name.includes("\\")) {
    throw new GitError("Invalid folder name");
  }
  mkdirSync(parentPath, { recursive: true });
  const destination = join(parentPath, name);
  if (existsSync(destination)) {
    throw new GitError(`${destination} already exists`);
  }

  const normalized = normalizeRemote(remoteUrl);
  if (!normalized) throw new GitError("Invalid Git URL");

  if (isGithubHost(normalized)) {
    const auth = spawnSync("gh", ["auth", "status"], {
      encoding: "utf8",
      timeout: 8000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (auth.status !== 0) {
      throw new GitError("GitHub CLI is required to download projects. Install gh and run `gh auth login`.");
    }
    const cloned = spawnSync("gh", ["repo", "clone", normalized, destination], {
      encoding: "utf8",
      timeout: 180000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (cloned.status !== 0) {
      const detail = (cloned.stderr || cloned.stdout || "").trim().split("\n").slice(-4).join(" ");
      throw new GitError(detail || "Could not clone with GitHub CLI");
    }
    return destination;
  }

  const result = spawnSync("git", ["clone", cloneUrl(remoteUrl), destination], {
    encoding: "utf8",
    timeout: 180000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim().split("\n").slice(-4).join(" ");
    throw new GitError(detail || "git clone failed");
  }
  return destination;
}

export type GithubRepo = {
  name: string;
  url: string;
  description: string;
};

export async function listGithubRepos(): Promise<GithubRepo[]> {
  const gh = spawnSync("gh", ["repo", "list", "--limit", "200", "--json", "name,url,description"], {
    encoding: "utf8",
    timeout: 60000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (gh.status === 0 && gh.stdout.trim()) {
    try {
      const rows = JSON.parse(gh.stdout) as { name: string; url: string; description?: string }[];
      return rows.map((row) => ({
        name: row.name,
        url: row.url,
        description: row.description || "",
      }));
    } catch {
      /* fall through */
    }
  }
  throw new GitError(gh.stderr?.trim() || "Could not read GitHub. Run `gh auth login`.");
}

export function suggestedCloneParent(cloneRoot: string, currentPath?: string): string {
  if (currentPath && existsSync(currentPath)) return resolve(currentPath, "..");
  return resolve(expandHome(cloneRoot));
}
