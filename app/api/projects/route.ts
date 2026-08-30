import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { NextResponse } from "next/server";
import { CreateProjectError, createLocalProject } from "@/lib/create-project";
import { projectIdFromPath } from "@/lib/id";
import { ensureColumn, defaultIdeaBoard, readStore, touchProject, writeStore } from "@/lib/store";
import { normalizeColor } from "@/lib/color";
import { normalizeIcon, removeIconFiles, withProjectIcon } from "@/lib/icon";
import type { Project } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    path?: string;
    name?: string;
    columnId?: string;
    parent?: string;
    templateId?: string;
    writeDocs?: boolean;
    gitInit?: boolean;
    create?: boolean;
  };

  if (body.create || body.parent) {
    try {
      const result = createLocalProject({
        name: body.name || "",
        parent: body.parent || "",
        templateId: body.templateId,
        writeDocs: body.writeDocs,
        gitInit: body.gitInit,
        columnId: body.columnId,
      });
      return NextResponse.json({ ok: true, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create the project";
      const status = error instanceof CreateProjectError ? 400 : 500;
      return NextResponse.json({ ok: false, error: message }, { status });
    }
  }

  const projectPath = body.path?.trim();
  if (!projectPath) return NextResponse.json({ ok: false, error: "Path is required" }, { status: 400 });
  const resolved = resolve(projectPath);
  if (!existsSync(resolved)) {
    return NextResponse.json({ ok: false, error: "That folder does not exist" }, { status: 400 });
  }

  const store = readStore();
  if (store.projects.some((project) => project.path === resolved)) {
    return NextResponse.json({ ok: false, error: "That project is already on the board" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const project: Project = {
    id: projectIdFromPath(resolved),
    path: resolved,
    name: body.name?.trim() || basename(resolved),
    columnId: ensureColumn(store, body.columnId || store.columns[0]?.id || "idea"),
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
    isGit: false,
    remoteUrl: null,
    docs: [],
    mtime: null,
    publishedHint: false,
    manual: true,
    trashed: false,
    trashedAt: null,
    ideas: defaultIdeaBoard(),
    actions: [],
    templateId: body.templateId || null,
  };
  store.projects.push(project);
  writeStore(store);
  return NextResponse.json({ ok: true, project: withProjectIcon(project) });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as Partial<Project> & { id?: string };
  if (!body.id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
  const store = readStore();
  const index = store.projects.findIndex((project) => project.id === body.id);
  if (index === -1) return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });

  const allowed: (keyof Project)[] = [
    "name",
    "columnId",
    "published",
    "notes",
    "hidden",
    "tags",
    "order",
    "ideas",
    "color",
    "icon",
    "actions",
    "templateId",
  ];
  const patch: Partial<Project> = {};
  for (const key of allowed) {
    if (key in body && body[key] !== undefined) {
      Object.assign(patch, { [key]: body[key] });
    }
  }
  if ("color" in patch) patch.color = normalizeColor(patch.color);
  if ("icon" in patch) {
    patch.icon = patch.icon === null ? null : normalizeIcon(patch.icon);
    if (patch.icon) {
      removeIconFiles(body.id);
      patch.iconExt = null;
    }
  }
  if (patch.columnId) patch.columnId = ensureColumn(store, patch.columnId);
  store.projects[index] = touchProject(store.projects[index], patch);
  writeStore(store);
  return NextResponse.json({ ok: true, project: withProjectIcon(store.projects[index]) });
}
