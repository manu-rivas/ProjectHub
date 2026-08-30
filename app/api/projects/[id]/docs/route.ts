import { NextResponse } from "next/server";
import { createDocsFromTemplate, DocError, listProjectDocs, previewDocs, writeProjectDoc } from "@/lib/docs";
import { withProjectIcon } from "@/lib/icon";
import { listTemplates } from "@/lib/templates";
import { readStore, touchProject, writeStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, templates: listTemplates() });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    content?: string;
    templateId?: string;
    overwrite?: boolean;
  };
  const store = readStore();
  const index = store.projects.findIndex((item) => item.id === id);
  if (index === -1) return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
  const project = store.projects[index];

  try {
    let written: string[] = [];
    if (body.templateId) {
      written = createDocsFromTemplate(project.path, project.name, body.templateId, Boolean(body.overwrite));
      store.projects[index] = touchProject(project, {
        docs: listProjectDocs(project.path),
        templateId: body.templateId,
      });
    } else if (body.name && typeof body.content === "string") {
      const name = writeProjectDoc(project.path, body.name, body.content);
      written = [name];
      store.projects[index] = touchProject(project, { docs: listProjectDocs(project.path) });
    } else {
      return NextResponse.json({ ok: false, error: "Provide a templateId or a markdown name and content" }, { status: 400 });
    }
    writeStore(store);
    return NextResponse.json({
      ok: true,
      written,
      project: withProjectIcon(store.projects[index]),
      docs: previewDocs(store.projects[index].path),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not write documentation";
    const status = error instanceof DocError ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
