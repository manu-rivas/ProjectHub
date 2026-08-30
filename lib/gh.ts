import { spawnSync } from "node:child_process";
import { GitError } from "./git";

export const BACKEND_REPO_NAME = "projecthub-data";

export function requireGhAuth(): void {
  const result = spawnSync("gh", ["auth", "status"], {
    encoding: "utf8",
    timeout: 8000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new GitError("Run `gh auth login`. ProjectHub uses gh and does not store tokens.");
  }
}

export function ghLogin(): string {
  requireGhAuth();
  const result = spawnSync("gh", ["api", "user", "--jq", ".login"], {
    encoding: "utf8",
    timeout: 15000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const login = (result.stdout || "").trim();
  if (result.status !== 0 || !login) {
    throw new GitError(result.stderr?.trim() || "Could not read the GitHub account. Try `gh auth login`.");
  }
  return login;
}

export function backendRepoSlug(): string {
  return `${ghLogin()}/${BACKEND_REPO_NAME}`;
}

export function gh(args: string[], timeout = 120000): { ok: boolean; stdout: string; stderr: string } {
  requireGhAuth();
  const result = spawnSync("gh", args, {
    encoding: "utf8",
    timeout,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    ok: result.status === 0,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

export function gitEnvWithGh(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, GIT_TERMINAL_PROMPT: "0" };
  const token = spawnSync("gh", ["auth", "token"], {
    encoding: "utf8",
    timeout: 8000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const value = token.status === 0 ? token.stdout.trim() : "";
  if (value) {
    env.GH_TOKEN = value;
    env.GITHUB_TOKEN = value;
  }
  return env;
}
