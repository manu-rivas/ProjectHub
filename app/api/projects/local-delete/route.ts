import { NextResponse } from "next/server";
import { deleteLocalCopy, LocalDeleteError } from "@/lib/local-delete";
import { readStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { id?: string; confirmName?: string };
  try {
    if (!body.id) return NextResponse.json({ ok: false, error: "Falta el id" }, { status: 400 });
    const store = readStore();
    const project = store.projects.find((item) => item.id === body.id);
    if (!project) return NextResponse.json({ ok: false, error: "Proyecto no encontrado" }, { status: 404 });
    if (body.confirmName?.trim() !== project.name) {
      return NextResponse.json({ ok: false, error: "El nombre no coincide" }, { status: 400 });
    }
    const next = deleteLocalCopy(body.id);
    return NextResponse.json({ ok: true, project: next });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo borrar en local";
    const status = error instanceof LocalDeleteError ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
