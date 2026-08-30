import { existsSync } from "node:fs";
import { basename } from "node:path";
import { cloneIntoParent, GitError, normalizeRemote, remoteKey, repoFolderName } from "./git";
import { isInside } from "./paths";
import { projectIdFromPath, projectIdFromRemote } from "./id";
import { defaultIdeaBoard, ensureColumn, readStore, touchProject, writeStore } from "./store";
import type { CatalogEntry, CatalogSource, Project, Store } from "./types";

export function findProjectByRemote(store: Store, url: string): Project | undefined {
  const key = remoteKey(url);
  if (!key) return undefined;
  return store.projects.find((project) => project.remoteUrl && remoteKey(project.remoteUrl) === key);
}

export function ensureRemoteOnBoard(
  store: Store,
  url: string,
  options?: { name?: string; notes?: string; source?: CatalogSource },
): { project: Project; entry: CatalogEntry; created: boolean } {
  const normalized = normalizeRemote(url);
  if (!normalized) throw new GitError("Invalid Git URL");
  const entry = addCatalogUrl(store, normalized, options?.name, options?.source || "manual");
  const existing = findProjectByRemote(store, normalized);
  if (existing) {
    if (options?.notes && !existing.notes) existing.notes = options.notes;
    entry.boardId = existing.id;
    entry.missing = existing.missing;
    entry.path = existing.path;
    return { project: existing, entry, created: false };
  }

  const now = new Date().toISOString();
  const project: Project = {
    id: projectIdFromRemote(remoteKey(normalized) || normalized),
    path: "",
    name: options?.name?.trim() || repoFolderName(normalized),
    columnId: ensureColumn(store, store.columns[0]?.id || "idea"),
    published: "unset",
    notes: options?.notes || "",
    hidden: false,
    tags: [],
    color: null,
    icon: null,
    iconExt: null,
    missing: true,
    order: Date.now(),
    updatedAt: now,
    scannedAt: now,
    isGit: true,
    remoteUrl: normalized,
    docs: [],
    mtime: null,
    publishedHint: true,
    manual: true,
    trashed: false,
    trashedAt: null,
    ideas: defaultIdeaBoard(),
    actions: [],
    templateId: null,
  };
  store.projects.push(project);
  entry.boardId = project.id;
  entry.name = project.name;
  entry.notes = project.notes;
  entry.missing = true;
  entry.path = "";
  return { project, entry, created: true };
}

export function addCatalogUrl(store: Store, url: string, name?: string, source: CatalogSource = "manual"): CatalogEntry {
  const normalized = normalizeRemote(url);
  if (!normalized) throw new GitError("Invalid Git URL");
  const key = remoteKey(normalized);
  const existing = store.catalog.find((entry) => entry.remoteUrl && remoteKey(entry.remoteUrl) === key);
  if (existing) return existing;
  const now = new Date().toISOString();
  const entry: CatalogEntry = {
    id: projectIdFromRemote(key || normalized),
    name: name?.trim() || repoFolderName(normalized),
    path: "",
    remoteUrl: normalized,
    notes: "",
    source,
    boardId: null,
    missing: true,
    trashed: false,
    updatedAt: now,
  };
  store.catalog.push(entry);
  return entry;
}

export function cloneCatalogEntry(input: {
  catalogId?: string;
  projectId?: string;
  url?: string;
  parent: string;
}): { entry: CatalogEntry; project: Project } {
  const store = readStore();
  const parent = input.parent.trim();
  if (!parent) throw new GitError("Choose a destination folder");
  if (store.settings.trashPath && isInside(store.settings.trashPath, parent)) {
    throw new GitError("Do not clone into the trash folder");
  }

  let entry =
    (input.catalogId ? store.catalog.find((item) => item.id === input.catalogId) : undefined) ||
    (input.projectId ? store.catalog.find((item) => item.boardId === input.projectId) : undefined) ||
    (input.url
      ? store.catalog.find((item) => item.remoteUrl && remoteKey(item.remoteUrl) === remoteKey(input.url || ""))
      : undefined);

  const url = entry?.remoteUrl || input.url || "";
  if (!normalizeRemote(url)) throw new GitError("This project has no Git remote to clone");

  if (!entry) {
    entry = addCatalogUrl(store, url, undefined, "manual");
  }

  const destination = cloneIntoParent(url, parent, entry.name || repoFolderName(url));
  const now = new Date().toISOString();

  let project = entry.boardId ? store.projects.find((item) => item.id === entry.boardId) : undefined;
  if (project) {
    const index = store.projects.findIndex((item) => item.id === project!.id);
    project = touchProject(project, {
      path: destination,
      name: project.name || basename(destination),
      missing: false,
      trashed: false,
      trashedAt: null,
      isGit: true,
      remoteUrl: normalizeRemote(url),
      scannedAt: now,
    });
    store.projects[index] = project;
  } else {
    const existingPath = store.projects.find((item) => item.path === destination);
    if (existingPath) {
      project = existingPath;
    } else {
      project = {
        id: projectIdFromPath(destination),
        path: destination,
        name: entry.name || basename(destination),
        columnId: ensureColumn(store, store.columns[0]?.id || "idea"),
        published: "unset",
        notes: entry.notes || "",
        hidden: false,
        tags: [],
        color: null,
        icon: null,
        iconExt: null,
        missing: false,
        order: Date.now(),
        updatedAt: now,
        scannedAt: now,
        isGit: existsSync(destination),
        remoteUrl: normalizeRemote(url),
        docs: [],
        mtime: now,
        publishedHint: true,
        manual: true,
        trashed: false,
        trashedAt: null,
        ideas: defaultIdeaBoard(),
        actions: [],
        templateId: null,
      };
      store.projects.push(project);
    }
  }

  const catalogIndex = store.catalog.findIndex((item) => item.id === entry.id);
  const nextEntry: CatalogEntry = {
    ...entry,
    path: destination,
    boardId: project.id,
    missing: false,
    trashed: false,
    remoteUrl: normalizeRemote(url),
    updatedAt: now,
  };
  if (catalogIndex === -1) store.catalog.push(nextEntry);
  else store.catalog[catalogIndex] = nextEntry;

  writeStore(store);
  return { entry: nextEntry, project };
}
