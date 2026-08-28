import { NextResponse } from "next/server";
import { GitError } from "@/lib/git";
import { publicSettings, readStore } from "@/lib/store";
import { resolveSyncRepo, syncHub } from "@/lib/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      repo: resolveSyncRepo(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "gh no está autenticado";
    return NextResponse.json({ ok: false, error: message, repo: "" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { action?: "sync" | "pull" | "push" };
  try {
    const result = syncHub(body.action || "sync");
    const store = readStore();
    return NextResponse.json({
      ok: true,
      repo: result.repo,
      pulled: result.pulled,
      pushed: result.pushed,
      created: result.created,
      count: result.count,
      settings: publicSettings(store.settings),
      columns: [...store.columns].sort((a, b) => a.order - b.order),
      projects: store.projects,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo sincronizar";
    const status = error instanceof GitError ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
