import { createHash, randomBytes } from "node:crypto";
import { cpSync, existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { expandHome, isInside } from "./paths";
import { readStore, touchProject, writeStore } from "./store";
import { TRASH_CONFIRM_PHRASE, TRASH_CONFIRM_PHRASES, type Project, type Store } from "./types";

export { TRASH_CONFIRM_PHRASE };

export class TrashError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrashError";
  }
}

function moveDirectory(from: string, to: string): void {
  mkdirSync(dirname(to), { recursive: true });
  try {
    renameSync(from, to);
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code !== "EXDEV") throw error;
    cpSync(from, to, { recursive: true });
    rmSync(from, { recursive: true, force: true });
  }
}

function findUnderTrashedParents(store: Store, project: Project): string | null {
  const name = basename(project.path);
  for (const other of store.projects) {
    if (!other.trashed || other.id === project.id) continue;
    if (!other.path || !existsSync(other.path)) continue;
    const candidate = join(other.path, name);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function markNestedMoved(store: Store, movedId: string, source: string, destination: string, now: string): Project[] {
  const extra: Project[] = [];
  const src = resolve(source);
  for (let i = 0; i < store.projects.length; i += 1) {
    const item = store.projects[i];
    if (item.id === movedId) continue;
    if (!isInside(src, item.path)) continue;
    const nextPath = join(destination, relative(src, resolve(item.path)));
    const next = touchProject(item, {
      path: nextPath,
      trashed: true,
      trashedAt: now,
      missing: !existsSync(nextPath),
    });
    store.projects[i] = next;
    extra.push(next);
  }
  return extra;
}

/** If a folder was trashed with its parent, mark nested catalog entries so they leave the kanban. */
export function reconcileTrashState(store: Store): boolean {
  const now = new Date().toISOString();
  const trashRoot = store.settings.trashPath?.trim()
    ? resolve(expandHome(store.settings.trashPath))
    : "";
  let dirty = false;

  for (let i = 0; i < store.projects.length; i += 1) {
    const project = store.projects[i];
    if (project.trashed) {
      if (!existsSync(project.path)) {
        const found = findUnderTrashedParents(store, project);
        if (found && found !== project.path) {
          store.projects[i] = touchProject(project, { path: found, missing: false });
          dirty = true;
        }
      }
      continue;
    }

    const relocated = findUnderTrashedParents(store, project);
    if (relocated) {
      store.projects[i] = touchProject(project, {
        path: relocated,
        trashed: true,
        trashedAt: now,
        missing: false,
      });
      dirty = true;
      continue;
    }

    if (trashRoot && existsSync(project.path) && isInside(trashRoot, project.path)) {
      store.projects[i] = touchProject(project, {
        trashed: true,
        trashedAt: now,
        missing: false,
      });
      dirty = true;
    }
  }

  return dirty;
}

function trashOne(store: Store, project: Project): Project[] {
  if (project.trashed) throw new TrashError(`${project.name} is already in the trash`);
  const trashPath = store.settings.trashPath?.trim();
  if (!trashPath) throw new TrashError("Set a trash folder in Settings");

  const now = new Date().toISOString();
  const source = resolve(project.path);
  const trashRoot = resolve(expandHome(trashPath));
  const relocated = findUnderTrashedParents(store, project);
  const livePath = existsSync(source) ? source : relocated;

  if (!livePath || !existsSync(livePath)) {
    return [
      touchProject(project, {
        trashed: true,
        trashedAt: now,
        missing: true,
      }),
    ];
  }

  if (isInside(livePath, trashRoot)) {
    throw new TrashError("The trash folder cannot live inside the project you are moving");
  }

  if (isInside(trashRoot, livePath)) {
    const extras = markNestedMoved(store, project.id, livePath, livePath, now);
    return [
      touchProject(project, {
        path: livePath,
        trashed: true,
        trashedAt: now,
        missing: false,
      }),
      ...extras,
    ];
  }

  const cwd = resolve(process.cwd());
  if (cwd === resolve(livePath) || isInside(livePath, cwd)) {
    throw new TrashError(`Cannot move ${project.name}: ProjectHub is using that folder`);
  }

  mkdirSync(trashRoot, { recursive: true });
  const hash = createHash("sha256")
    .update(`${livePath}:${Date.now()}:${randomBytes(8).toString("hex")}`)
    .digest("hex")
    .slice(0, 8);
  const destination = join(trashRoot, `${basename(livePath)}-${hash}`);
  if (existsSync(destination)) throw new TrashError("Name collision in trash; try again");

  moveDirectory(livePath, destination);
  const extras = markNestedMoved(store, project.id, livePath, destination, now);
  return [
    touchProject(project, {
      path: destination,
      trashed: true,
      trashedAt: now,
      missing: false,
    }),
    ...extras,
  ];
}

export function moveProjectsToTrash(input: {
  ids: string[];
  confirmPhrase: string;
  confirmCount: number;
  confirmName?: string;
}): { moved: Project[]; errors: string[] } {
  if (!TRASH_CONFIRM_PHRASES.includes(input.confirmPhrase.trim() as (typeof TRASH_CONFIRM_PHRASES)[number])) {
    throw new TrashError(`Type ${TRASH_CONFIRM_PHRASE} exactly to confirm`);
  }
  const ids = [...new Set(input.ids.filter(Boolean))];
  if (ids.length === 0) throw new TrashError("No projects to move");
  if (input.confirmCount !== ids.length) {
    throw new TrashError(`Confirm the number of projects (${ids.length})`);
  }
  if (ids.length === 1 && input.confirmName !== undefined) {
    const store = readStore();
    const project = store.projects.find((item) => item.id === ids[0]);
    if (!project) throw new TrashError("Project not found");
    if (input.confirmName.trim() !== project.name) {
      throw new TrashError("The name does not match the project");
    }
  }

  const store = readStore();
  if (!store.settings.trashPath?.trim()) throw new TrashError("Set a trash folder in Settings");

  const moved: Project[] = [];
  const errors: string[] = [];

  for (const id of ids) {
    const index = store.projects.findIndex((project) => project.id === id);
    if (index === -1) {
      errors.push(`Not found: ${id}`);
      continue;
    }
    try {
      const batch = trashOne(store, store.projects[index]);
      const [main, ...rest] = batch;
      store.projects[index] = main;
      for (const extra of rest) {
        const extraIndex = store.projects.findIndex((project) => project.id === extra.id);
        if (extraIndex !== -1) store.projects[extraIndex] = extra;
      }
      writeStore(store);
      moved.push(...batch);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Could not move");
    }
  }

  if (moved.length === 0 && errors.length > 0) {
    throw new TrashError(errors.join(" · "));
  }
  return { moved, errors };
}
