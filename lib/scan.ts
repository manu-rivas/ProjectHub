import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { listProjectDocs, readProjectDoc } from "./docs";
import { projectIdFromPath } from "./id";
import { expandHome, isInside } from "./paths";
import { remoteKey } from "./git";
import { reconcileTrashState } from "./trash";
import { ensureColumn, defaultIdeaBoard, readStore, writeStore } from "./store";
import { DOC_FILES, type Project, type Store } from "./types";

const PROJECT_MARKERS = ["package.json", "Cargo.toml", "pyproject.toml", "go.mod", "composer.json"];

function isIgnored(name: string, ignore: string[]): boolean {
  if (name.startsWith(".") && name !== ".") return true;
  return ignore.includes(name);
}

function hasMarker(dir: string): boolean {
  if (existsSync(join(dir, ".git"))) return true;
  return PROJECT_MARKERS.some((file) => existsSync(join(dir, file)));
}

function listDirs(dir: string, ignore: string[]): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !isIgnored(entry.name, ignore))
      .map((entry) => join(dir, entry.name));
  } catch {
    return [];
  }
}

function gitRemote(dir: string): string | null {
  const result = spawnSync("git", ["remote", "get-url", "origin"], {
    cwd: dir,
    encoding: "utf8",
    timeout: 1500,
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (result.status !== 0) return null;
  const url = (result.stdout || "").trim();
  return url || null;
}

function inspect(dir: string): Pick<Project, "isGit" | "remoteUrl" | "docs" | "mtime" | "publishedHint"> {
  const isGit = existsSync(join(dir, ".git"));
  const remoteUrl = isGit ? gitRemote(dir) : null;
  const docs = listProjectDocs(dir).filter((file) => (DOC_FILES as readonly string[]).includes(file) || file.endsWith(".md"));
  let mtime: string | null = null;
  try {
    mtime = statSync(dir).mtime.toISOString();
  } catch {
    mtime = null;
  }
  const publishedHint = Boolean(
    remoteUrl && /github\.com|gitlab\.com|bitbucket\.org/i.test(remoteUrl),
  );
  return { isGit, remoteUrl, docs, mtime, publishedHint };
}

function collectProjects(root: string, maxDepth: number, ignore: string[], scanRoots: Set<string>): string[] {
  const found: string[] = [];
  const resolvedRoot = resolve(expandHome(root));
  if (!existsSync(resolvedRoot)) return found;

  for (const child of listDirs(resolvedRoot, ignore)) {
    const resolved = resolve(child);
    if (scanRoots.has(resolved)) continue;
    found.push(resolved);
    if (maxDepth >= 2 && !hasMarker(resolved)) {
      for (const grand of listDirs(resolved, ignore)) {
        const nested = resolve(grand);
        if (!scanRoots.has(nested) && hasMarker(nested)) found.push(nested);
      }
    }
  }
  return found;
}

export function scanIntoStore(store: Store): { added: number; updated: number; missing: number } {
  const ignore = store.settings.ignore;
  const depth = Math.min(Math.max(store.settings.depth || 2, 1), 3);
  const scanRoots = store.settings.scanRoots.map((root) => resolve(expandHome(root)));
  const rootSet = new Set(scanRoots);

  const discovered = new Map<string, string>();
  const trashRoot = store.settings.trashPath ? resolve(expandHome(store.settings.trashPath)) : "";
  for (const root of scanRoots) {
    for (const path of collectProjects(root, depth, ignore, rootSet)) {
      if (trashRoot && isInside(trashRoot, path)) continue;
      discovered.set(path, path);
    }
  }

  const now = new Date().toISOString();
  const byPath = new Map(store.projects.map((project) => [project.path, project]));
  const byRemote = new Map<string, Project>();
  for (const project of store.projects) {
    if (!project.remoteUrl) continue;
    const key = remoteKey(project.remoteUrl);
    if (key) byRemote.set(key, project);
  }
  let added = 0;
  let updated = 0;

  const idea = store.columns.find((column) => column.id === "idea")?.id ?? ensureColumn(store, store.columns[0]?.id ?? "idea");
  const publicado = store.columns.find((column) => column.id === "publicado")?.id;

  for (const path of discovered.values()) {
    const snapshot = inspect(path);
    const remote = snapshot.remoteUrl ? remoteKey(snapshot.remoteUrl) : null;
    const existing = byPath.get(path) || (remote ? byRemote.get(remote) : undefined);
    if (existing) {
      Object.assign(existing, snapshot, {
        path,
        missing: false,
        scannedAt: now,
        name: existing.name || basename(path),
        remoteUrl: snapshot.remoteUrl || existing.remoteUrl,
        isGit: snapshot.isGit || existing.isGit,
      });
      byPath.set(path, existing);
      updated += 1;
      continue;
    }
    const columnId = snapshot.publishedHint && publicado ? publicado : idea;
    const project: Project = {
      id: projectIdFromPath(path),
      path,
      name: basename(path),
      columnId,
      published: "unset",
      notes: "",
      hidden: false,
      tags: [],
      color: null,
      icon: null,
      iconExt: null,
      missing: false,
      order: Date.now(),
      updatedAt: now,
      scannedAt: now,
      manual: false,
      trashed: false,
      trashedAt: null,
      ideas: defaultIdeaBoard(),
      actions: [],
      templateId: null,
      ...snapshot,
    };
    store.projects.push(project);
    byPath.set(path, project);
    added += 1;
  }

  let missing = 0;
  for (const project of store.projects) {
    if (project.trashed) continue;
    const onDisk = Boolean(project.path && existsSync(project.path));
    if (onDisk) {
      if (project.missing) {
        project.missing = false;
        project.updatedAt = now;
      }
      continue;
    }
    if (!project.missing) {
      project.missing = true;
      project.updatedAt = now;
      missing += 1;
    }
  }

  reconcileTrashState(store);
  writeStore(store);
  return { added, updated, missing };
}

export function readDocExcerpt(projectPath: string, fileName: string, limit = 4000): string {
  return readProjectDoc(projectPath, fileName, limit);
}

export function runScan(): { store: Store; added: number; updated: number; missing: number } {
  const store = readStore();
  const result = scanIntoStore(store);
  return { store: readStore(), ...result };
}
