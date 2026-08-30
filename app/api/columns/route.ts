import { NextResponse } from "next/server";
import { addColumn, ensureColumn, readStore, writeStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { title?: string };
  const store = readStore();
  const column = addColumn(store, body.title || "New column");
  writeStore(store);
  return NextResponse.json({ ok: true, column, columns: store.columns });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as { id?: string; title?: string; order?: number };
  if (!body.id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
  const store = readStore();
  const column = store.columns.find((item) => item.id === body.id);
  if (!column) return NextResponse.json({ ok: false, error: "Column not found" }, { status: 404 });
  if (typeof body.title === "string") column.title = body.title.trim() || column.title;
  if (typeof body.order === "number") column.order = body.order;
  writeStore(store);
  return NextResponse.json({ ok: true, column, columns: store.columns });
}

export async function DELETE(request: Request) {
  const body = (await request.json()) as { id?: string };
  if (!body.id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
  const store = readStore();
  if (store.columns.length <= 1) {
    return NextResponse.json({ ok: false, error: "You need at least one column" }, { status: 400 });
  }
  const remaining = store.columns.filter((column) => column.id !== body.id);
  if (remaining.length === store.columns.length) {
    return NextResponse.json({ ok: false, error: "Column not found" }, { status: 404 });
  }
  store.columns = remaining;
  const fallback = remaining.sort((a, b) => a.order - b.order)[0].id;
  for (const project of store.projects) {
    if (project.columnId === body.id) project.columnId = ensureColumn(store, fallback);
  }
  writeStore(store);
  return NextResponse.json({ ok: true, columns: store.columns, projects: store.projects });
}
