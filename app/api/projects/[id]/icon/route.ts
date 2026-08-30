import { existsSync, readFileSync } from "node:fs";
import { extname } from "node:path";
import { NextResponse } from "next/server";
import { findIconFile, ICON_TYPES, normalizeIcon, removeIconFiles, writeIconFile } from "@/lib/icon";
import { readStore, touchProject, writeStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 1_500_000;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const store = readStore();
  const project = store.projects.find((item) => item.id === id);
  if (!project) return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });

  const file = findIconFile(id);
  if (!file || !existsSync(file)) {
    return NextResponse.json({ ok: false, error: "No icon" }, { status: 404 });
  }

  const type = ICON_TYPES[extname(file).toLowerCase()];
  if (!type) return NextResponse.json({ ok: false, error: "File type not allowed" }, { status: 415 });

  return new NextResponse(new Uint8Array(readFileSync(file)), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, max-age=30",
    },
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const store = readStore();
  const index = store.projects.findIndex((item) => item.id === id);
  if (index === -1) return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });

  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { emoji?: string; icon?: string };
      const emoji = normalizeIcon(body.emoji ?? body.icon);
      if (!emoji) return NextResponse.json({ ok: false, error: "Pick a short emoji or symbol" }, { status: 400 });
      store.projects[index] = touchProject(store.projects[index], { icon: emoji });
      writeStore(store);
      return NextResponse.json({ ok: true, project: store.projects[index] });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Choose an image file" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "Icon must be under 1.5 MB" }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = writeIconFile(id, bytes, file.type);
    store.projects[index] = touchProject(store.projects[index], { iconExt: ext });
    writeStore(store);
    return NextResponse.json({ ok: true, project: store.projects[index] });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not save the icon" },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const store = readStore();
  const index = store.projects.findIndex((item) => item.id === id);
  if (index === -1) return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
  removeIconFiles(id);
  store.projects[index] = touchProject(store.projects[index], { icon: null, iconExt: null });
  writeStore(store);
  return NextResponse.json({ ok: true, project: store.projects[index] });
}
