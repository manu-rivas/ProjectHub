import { NextResponse } from "next/server";
import { previewDocs } from "@/lib/docs";
import { detectedActions, mergeActions } from "@/lib/actions";
import { readStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const store = readStore();
  const project = store.projects.find((item) => item.id === id);
  if (!project) return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });

  const docs = previewDocs(project.path);
  const actions = mergeActions(project.actions, detectedActions(project.path));
  return NextResponse.json({ ok: true, project, docs, actions });
}
