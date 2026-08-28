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
  if (index === -1) throw new LocalDeleteError("Proyecto no encontrado");
  const project = store.projects[index];
  if (project.trashed) {
    throw new LocalDeleteError("Está en la papelera. Eso es otro flujo; sácalo de ahí o déjalo.");
  }
  if (!project.path || project.missing || !existsSync(project.path)) {
    throw new LocalDeleteError("No hay carpeta local que borrar. El proyecto ya está solo en Git.");
  }

  const source = resolve(project.path);
  const cwd = resolve(process.cwd());
  if (cwd === source || isInside(source, cwd)) {
    throw new LocalDeleteError(`No se puede borrar ${project.name}: ProjectHub lo está usando`);
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
