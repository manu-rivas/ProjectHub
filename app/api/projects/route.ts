import { existsSync } from "node:fs";
import { basename, resolve } from "node:path";
import { NextResponse } from "next/server";
import { projectIdFromPath } from "@/lib/id";
import { ensureColumn, defaultIdeaBoard, readStore, touchProject, writeStore } from "@/lib/store";
import type { Project } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { path?: string; name?: string; columnId?: string };
  const projectPath = body.path?.trim();
  if (!projectPath) return NextResponse.json({ ok: false, error: "Falta la ruta" }, { status: 400 });
  const resolved = resolve(projectPath);
  if (!existsSync(resolved)) {
    return NextResponse.json({ ok: false, error: "Esa carpeta no existe" }, { status: 400 });
  }

  const store = readStore();
  if (store.projects.some((project) => project.path === resolved)) {
    return NextResponse.json({ ok: false, error: "Ese proyecto ya está en el tablero" }, { status: 409 });
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
  };
  store.projects.push(project);
  writeStore(store);
  return NextResponse.json({ ok: true, project });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as Partial<Project> & { id?: string };
  if (!body.id) return NextResponse.json({ ok: false, error: "Falta el id" }, { status: 400 });
  const store = readStore();
  const index = store.projects.findIndex((project) => project.id === body.id);
  if (index === -1) return NextResponse.json({ ok: false, error: "Proyecto no encontrado" }, { status: 404 });

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
  ];
  const patch: Partial<Project> = {};
  for (const key of allowed) {
    if (key in body && body[key] !== undefined) {
      Object.assign(patch, { [key]: body[key] });
    }
  }
  if (patch.columnId) patch.columnId = ensureColumn(store, patch.columnId);
  store.projects[index] = touchProject(store.projects[index], patch);
  writeStore(store);
  return NextResponse.json({ ok: true, project: store.projects[index] });
}
