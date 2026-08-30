import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { cloneUrl, GitError, remoteKey } from "./git";
import { BACKEND_REPO_NAME, backendRepoSlug, gh, gitEnvWithGh, requireGhAuth } from "./gh";
import { defaultIdeaBoard, readStore, writeStore } from "./store";
import type { CatalogEntry, Column, Project, Store } from "./types";

export const SYNC_DIR = join(homedir(), ".projecthub", "sync");
export const BOARD_FILE = "board.json";

export type SyncSnapshot = {
  version: 1;
  exportedAt: string;
  columns: Column[];
  projects: Project[];
  catalog: CatalogEntry[];
};

function git(cwd: string, args: string[], timeout = 120000): { ok: boolean; stdout: string; stderr: string } {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    timeout,
    env: gitEnvWithGh(),
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    ok: result.status === 0,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
  };
}

function gitOrThrow(cwd: string, args: string[], timeout?: number): string {
  const result = git(cwd, args, timeout);
  if (!result.ok) throw new GitError(result.stderr || result.stdout || `git ${args[0]} failed`);
  return result.stdout;
}

export function resolveSyncRepo(): string {
  return backendRepoSlug();
}

export function snapshotFromStore(store: Store): SyncSnapshot {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    columns: store.columns,
    projects: store.projects.map((project) => ({
      ...project,
      docs: project.path && existsSync(project.path) ? project.docs : [],
    })),
    catalog: store.catalog,
  };
}

function projectMatchKey(project: Project): string {
  if (project.remoteUrl) {
    const key = remoteKey(project.remoteUrl);
    if (key) return `remote:${key}`;
  }
  return `id:${project.id}`;
}

function refreshDisk(project: Project): Project {
  const onDisk = Boolean(project.path && existsSync(project.path));
  return {
    ...project,
    missing: !onDisk,
    trashed: onDisk ? Boolean(project.trashed) : false,
    trashedAt: onDisk ? project.trashedAt : null,
        ideas:
          project.ideas && Array.isArray(project.ideas.columns) && Array.isArray(project.ideas.cards)
            ? project.ideas
            : defaultIdeaBoard(),
        actions: Array.isArray(project.actions) ? project.actions : [],
        templateId: project.templateId ?? null,
  };
}

function mergeProjects(local: Project[], incoming: Project[]): Project[] {
  const byKey = new Map<string, Project>();
  for (const project of local) {
    byKey.set(projectMatchKey(project), project);
  }
  for (const remote of incoming) {
    const key = projectMatchKey(remote);
    const current = byKey.get(key);
    const localOnDisk = Boolean(current?.path && existsSync(current.path));
    const merged: Project = {
      ...remote,
      id: current?.id || remote.id,
      path: localOnDisk ? current!.path : remote.path,
      ideas: remote.ideas?.cards ? remote.ideas : current?.ideas || defaultIdeaBoard(),
      notes: remote.notes || current?.notes || "",
      color: remote.color || current?.color || null,
      icon: remote.icon || current?.icon || null,
      iconExt: remote.iconExt || current?.iconExt || null,
      actions: remote.actions?.length ? remote.actions : current?.actions || [],
      templateId: remote.templateId || current?.templateId || null,
    };
    byKey.set(key, refreshDisk(merged));
  }
  return [...byKey.values()];
}

function mergeCatalog(local: CatalogEntry[], incoming: CatalogEntry[]): CatalogEntry[] {
  const byKey = new Map<string, CatalogEntry>();
  for (const entry of [...local, ...incoming]) {
    const key = entry.remoteUrl ? `remote:${remoteKey(entry.remoteUrl) || entry.remoteUrl}` : `id:${entry.id}`;
    const prev = byKey.get(key);
    byKey.set(key, prev ? { ...prev, ...entry, notes: entry.notes || prev.notes } : entry);
  }
  return [...byKey.values()];
}

function mergeColumns(local: Column[], incoming: Column[]): Column[] {
  if (!incoming.length) return local;
  const byId = new Map(local.map((column) => [column.id, column]));
  for (const column of incoming) byId.set(column.id, column);
  return [...byId.values()].sort((a, b) => a.order - b.order);
}

function applySnapshot(store: Store, snapshot: SyncSnapshot): void {
  store.columns = mergeColumns(store.columns, snapshot.columns || []);
  store.projects = mergeProjects(store.projects, snapshot.projects || []);
  store.catalog = mergeCatalog(store.catalog, snapshot.catalog || []);
}

function readSnapshot(dir: string): SyncSnapshot | null {
  const path = join(dir, BOARD_FILE);
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<SyncSnapshot>;
    if (!Array.isArray(parsed.projects) && !Array.isArray(parsed.catalog)) return null;
    return {
      version: 1,
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      columns: Array.isArray(parsed.columns) ? parsed.columns : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      catalog: Array.isArray(parsed.catalog) ? parsed.catalog : [],
    };
  } catch {
    throw new GitError("Backend board.json is not valid JSON");
  }
}

function writeSnapshot(dir: string, snapshot: SyncSnapshot): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, BOARD_FILE), `${JSON.stringify(snapshot, null, 2)}\n`);
}

function remoteExists(slug: string): boolean {
  return gh(["repo", "view", slug, "--json", "name"]).ok;
}

function dirIsEmpty(dir: string): boolean {
  try {
    return readdirSync(dir).length === 0;
  } catch {
    return true;
  }
}

function initLocalGit(dir: string): void {
  mkdirSync(dir, { recursive: true });
  if (!existsSync(join(dir, ".git"))) {
    gitOrThrow(dir, ["init", "-b", "main"]);
  }
}

function commitBoard(dir: string): void {
  gitOrThrow(dir, ["add", BOARD_FILE]);
  const commit = git(
    dir,
    [
      "-c",
      "user.name=ProjectHub",
      "-c",
      "user.email=projecthub@local",
      "commit",
      "-m",
      `Sync board ${new Date().toISOString().slice(0, 16)}`,
    ],
    30000,
  );
  if (!commit.ok && !/nothing to commit/i.test(`${commit.stderr} ${commit.stdout}`)) {
    throw new GitError(commit.stderr || commit.stdout || "Could not commit the backend");
  }
}

function createRemoteRepo(dir: string): void {
  const created = gh(
    [
      "repo",
      "create",
      BACKEND_REPO_NAME,
      "--private",
      "--source",
      dir,
      "--remote",
      "origin",
      "--push",
      "--description",
      "ProjectHub JSON backend",
    ],
    180000,
  );
  if (!created.ok) {
    throw new GitError(created.stderr || `Could not create ${BACKEND_REPO_NAME} with gh`);
  }
}

function ensureRemoteClone(slug: string): string {
  mkdirSync(join(homedir(), ".projecthub"), { recursive: true });
  const origin = cloneUrl(`https://github.com/${slug}`);

  if (existsSync(join(SYNC_DIR, ".git"))) {
    git(SYNC_DIR, ["remote", "set-url", "origin", origin]);
    const pull = git(SYNC_DIR, ["pull", "--ff-only"], 120000);
    if (!pull.ok && !/no tracking|couldn't find remote|unborn|unknown revision|no such ref|couldn't find remote ref/i.test(`${pull.stderr} ${pull.stdout}`)) {
      throw new GitError(pull.stderr || pull.stdout || "Could not pull the backend");
    }
    return SYNC_DIR;
  }

  if (existsSync(SYNC_DIR) && !dirIsEmpty(SYNC_DIR)) {
    initLocalGit(SYNC_DIR);
    git(SYNC_DIR, ["remote", "remove", "origin"]);
    gitOrThrow(SYNC_DIR, ["remote", "add", "origin", origin]);
    git(SYNC_DIR, ["pull", "--ff-only", "origin", "main"], 120000);
    return SYNC_DIR;
  }

  const cloned = gh(["repo", "clone", slug, SYNC_DIR], 180000);
  if (!cloned.ok) throw new GitError(cloned.stderr || `Could not clone ${slug} with gh`);
  return SYNC_DIR;
}

function pushIfNeeded(dir: string): boolean {
  const status = gitOrThrow(dir, ["status", "--porcelain"]);
  if (status) commitBoard(dir);
  const pushed = git(dir, ["push", "-u", "origin", "HEAD"], 120000);
  if (!pushed.ok) {
    throw new GitError(pushed.stderr || "Could not push the backend. Try `gh auth login`.");
  }
  return true;
}

export function syncHub(action: "sync" | "pull" | "push" = "sync"): {
  action: string;
  repo: string;
  pulled: boolean;
  pushed: boolean;
  created: boolean;
  count: number;
} {
  requireGhAuth();
  const store = readStore();
  const repo = resolveSyncRepo();
  let pulled = false;
  let pushed = false;
  let created = false;

  if (remoteExists(repo)) {
    const dir = ensureRemoteClone(repo);
    if (action === "sync" || action === "pull") {
      const snapshot = readSnapshot(dir);
      if (snapshot) {
        applySnapshot(store, snapshot);
        pulled = true;
      }
    }
    writeStore(store);
    if (action === "sync" || action === "push") {
      writeSnapshot(dir, snapshotFromStore(readStore()));
      pushed = pushIfNeeded(dir);
    }
  } else {
    created = true;
    initLocalGit(SYNC_DIR);
    git(SYNC_DIR, ["remote", "remove", "origin"]);
    writeStore(store);
    writeSnapshot(SYNC_DIR, snapshotFromStore(readStore()));
    commitBoard(SYNC_DIR);
    createRemoteRepo(SYNC_DIR);
    pushed = true;
  }

  const latest = readStore();
  return {
    action,
    repo,
    pulled,
    pushed,
    created,
    count: latest.projects.length,
  };
}
