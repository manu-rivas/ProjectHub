import { existsSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, join, resolve } from "node:path";
import { projectIdFromPath } from "./id";
import { expandHome, isInside } from "./paths";
import { defaultIdeaBoard, ensureColumn, readStore, writeStore } from "./store";
import { createDocsFromTemplate } from "./docs";
import type { Project } from "./types";

export class CreateProjectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CreateProjectError";
  }
}

function slugFolder(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug || slug === "." || slug === "..") throw new CreateProjectError("Choose a folder name");
  return slug;
}

export function createLocalProject(input: {
  name: string;
  parent: string;
  templateId?: string;
  writeDocs?: boolean;
  gitInit?: boolean;
  columnId?: string;
}): { project: Project; createdDocs: string[] } {
  const store = readStore();
  const parent = resolve(expandHome(input.parent));
  const folder = slugFolder(input.name);
  const destination = join(parent, folder);

  if (store.settings.trashPath && isInside(store.settings.trashPath, destination)) {
    throw new CreateProjectError("Do not create a project inside the trash folder");
  }
  if (existsSync(destination)) {
    throw new CreateProjectError(`Folder already exists: ${destination}`);
  }
  if (store.projects.some((project) => project.path === destination)) {
    throw new CreateProjectError("That project is already on the board");
  }

  mkdirSync(parent, { recursive: true });
  mkdirSync(destination);

  const createdDocs =
    input.writeDocs === false
      ? []
      : createDocsFromTemplate(destination, input.name.trim() || folder, input.templateId || "web-app");

  if (input.gitInit !== false) {
    spawnSync("git", ["init", "-b", "main"], {
      cwd: destination,
      encoding: "utf8",
      timeout: 8000,
      stdio: ["ignore", "pipe", "pipe"],
    });
  }

  const now = new Date().toISOString();
  const project: Project = {
    id: projectIdFromPath(destination),
    path: destination,
    name: input.name.trim() || basename(destination),
    columnId: ensureColumn(store, input.columnId || store.columns[0]?.id || "idea"),
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
    isGit: existsSync(join(destination, ".git")),
    remoteUrl: null,
    docs: createdDocs,
    mtime: now,
    publishedHint: false,
    manual: true,
    trashed: false,
    trashedAt: null,
    ideas: defaultIdeaBoard(),
    actions: [],
    templateId: input.templateId || "web-app",
  };
  store.projects.push(project);
  writeStore(store);
  return { project, createdDocs };
}
