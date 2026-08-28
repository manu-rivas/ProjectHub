import { NextResponse } from "next/server";
import { cloneCatalogEntry } from "@/lib/catalog";
import { GitError, pickFolder, suggestedCloneParent } from "@/lib/git";
import { readStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const body = (await request.json()) as {
    catalogId?: string;
    projectId?: string;
    url?: string;
    parent?: string;
    pickParent?: boolean;
  };
  try {
    const store = readStore();
    const parent = body.pickParent
      ? pickFolder("Elige la carpeta donde clonar el proyecto")
      : body.parent?.trim() || suggestedCloneParent(store.settings.cloneRoot);
    const result = cloneCatalogEntry({
      catalogId: body.catalogId,
      projectId: body.projectId,
      url: body.url,
      parent,
    });
    return NextResponse.json({ ok: true, ...result, parent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo clonar";
    const status = error instanceof GitError ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
