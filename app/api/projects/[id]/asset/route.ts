import { existsSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { NextResponse } from "next/server";
import { readStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

function insideRoot(root: string, candidate: string): boolean {
  const base = resolve(root);
  const full = resolve(candidate);
  return full === base || full.startsWith(`${base}/`);
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const relative = new URL(request.url).searchParams.get("path") || "";
  if (!relative || relative.includes("\0")) {
    return NextResponse.json({ ok: false, error: "Ruta inválida" }, { status: 400 });
  }

  const store = readStore();
  const project = store.projects.find((item) => item.id === id);
  if (!project) return NextResponse.json({ ok: false, error: "Proyecto no encontrado" }, { status: 404 });

  const target = resolve(project.path, relative);
  if (!insideRoot(project.path, target) || !existsSync(target)) {
    return NextResponse.json({ ok: false, error: "Archivo no encontrado" }, { status: 404 });
  }

  const type = TYPES[extname(target).toLowerCase()];
  if (!type) return NextResponse.json({ ok: false, error: "Tipo no permitido" }, { status: 415 });

  const body = new Uint8Array(readFileSync(target));
  return new NextResponse(body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, max-age=60",
    },
  });
}
