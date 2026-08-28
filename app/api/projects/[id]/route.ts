import { NextResponse } from "next/server";
import { readDocExcerpt } from "@/lib/scan";
import { readStore } from "@/lib/store";
import type { DocPreview } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILES = ["README.md", "PRODUCT.md", "AGENTS.md"] as const;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const store = readStore();
  const project = store.projects.find((item) => item.id === id);
  if (!project) return NextResponse.json({ ok: false, error: "Proyecto no encontrado" }, { status: 404 });

  const docs: DocPreview[] = FILES.map((name) => ({
    name,
    exists: project.docs.includes(name),
    excerpt: project.docs.includes(name) ? readDocExcerpt(project.path, name, 400_000) : "",
  }));

  return NextResponse.json({ ok: true, project, docs });
}
