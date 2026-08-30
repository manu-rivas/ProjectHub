import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { isInside } from "./paths";
import { readStore, touchProject, writeStore } from "./store";
import type { Project } from "./types";

export class LocalDeleteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LocalDeleteError";
  }
}

export function deleteLocalCopy(id: string): Project {
  const store = readStore();
  const index = store.projects.findIndex((project) => project.id === id);
  if (index === -1) throw new LocalDeleteError("Project not found");
  const project = store.projects[index];
  if (project.trashed) {
    throw new LocalDeleteError("This project is already in the trash. Use that flow instead.");
  }
  if (!project.path || project.missing || !existsSync(project.path)) {
    throw new LocalDeleteError("There is no local folder to delete. This project is Git-only.");
  }

  const source = resolve(project.path);
  const cwd = resolve(process.cwd());
  if (cwd === source || isInside(source, cwd)) {
    throw new LocalDeleteError(`Cannot delete ${project.name}: ProjectHub is using that folder`);
  }

  rmSync(source, { recursive: true, force: true });
  const next = touchProject(project, {
    missing: true,
    docs: [],
    mtime: null,
    scannedAt: new Date().toISOString(),
  });
  store.projects[index] = next;
  writeStore(store);
  return next;
}
