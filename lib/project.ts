import type { Project } from "./types";

export function hasLocalCopy(project: Project): boolean {
  return Boolean(project.path) && !project.missing && !project.trashed;
}

export function isGitOnly(project: Project): boolean {
  return Boolean(project.remoteUrl) && !project.trashed && (project.missing || !project.path);
}
