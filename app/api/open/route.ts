import { NextResponse } from "next/server";
import { openProject, type OpenTarget } from "@/lib/open";
import { readStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TARGETS: OpenTarget[] = ["cursor", "codex", "finder"];

export async function POST(request: Request) {
  const body = (await request.json()) as { id?: string; target?: OpenTarget };
  if (!body.id || !body.target || !TARGETS.includes(body.target)) {
    return NextResponse.json({ ok: false, error: "Petición inválida" }, { status: 400 });
  }
  const store = readStore();
  const project = store.projects.find((item) => item.id === body.id);
  if (!project) return NextResponse.json({ ok: false, error: "Proyecto no encontrado" }, { status: 404 });
  const result = openProject(project.path, body.target);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true });
}
