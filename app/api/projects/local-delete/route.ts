import { NextResponse } from "next/server";
import { deleteLocalCopy, LocalDeleteError } from "@/lib/local-delete";
import { readStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { id?: string; confirmName?: string };
  try {
    if (!body.id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
    const store = readStore();
    const project = store.projects.find((item) => item.id === body.id);
    if (!project) return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
    if (body.confirmName?.trim() !== project.name) {
      return NextResponse.json({ ok: false, error: "The name does not match" }, { status: 400 });
    }
    const next = deleteLocalCopy(body.id);
    return NextResponse.json({ ok: true, project: next });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete the local folder";
    const status = error instanceof LocalDeleteError ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
