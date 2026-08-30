import { NextResponse } from "next/server";
import { ensureRemoteOnBoard } from "@/lib/catalog";
import { GitError } from "@/lib/git";
import { publicSettings, readStore, writeStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const store = readStore();
  writeStore(store);
  return NextResponse.json({
    ok: true,
    catalog: store.catalog,
    settings: publicSettings(store.settings),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { url?: string; name?: string };
  try {
    const store = readStore();
    const result = ensureRemoteOnBoard(store, body.url || "", { name: body.name, source: "manual" });
    writeStore(store);
    return NextResponse.json({
      ok: true,
      entry: result.entry,
      project: result.project,
      created: result.created,
      catalog: store.catalog,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the URL";
    const status = error instanceof GitError ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
