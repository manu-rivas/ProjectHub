import { NextResponse } from "next/server";
import { moveProjectsToTrash, TrashError } from "@/lib/trash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    id?: string;
    ids?: string[];
    confirmName?: string;
    confirmPhrase?: string;
    confirmCount?: number;
  };
  const ids = body.ids?.length ? body.ids : body.id ? [body.id] : [];
  try {
    const result = moveProjectsToTrash({
      ids,
      confirmPhrase: body.confirmPhrase || "",
      confirmCount: typeof body.confirmCount === "number" ? body.confirmCount : ids.length === 1 ? 1 : -1,
      confirmName: body.confirmName,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo mover a la papelera";
    const status = error instanceof TrashError ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
