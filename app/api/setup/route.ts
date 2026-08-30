import { NextResponse } from "next/server";
import { expandHome } from "@/lib/paths";
import { sqliteStatus } from "@/lib/sqlite";
import { initializeSqlite, publicSettings, readStore, writeStore } from "@/lib/store";
import { GitError } from "@/lib/git";
import { resolveSyncRepo, syncHub } from "@/lib/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const store = readStore();
  let backend: { ok: boolean; repo: string; error?: string } = { ok: false, repo: "" };
  try {
    backend = { ok: true, repo: resolveSyncRepo() };
  } catch (error) {
    backend = { ok: false, repo: "", error: error instanceof Error ? error.message : "gh is not authenticated" };
  }
  return NextResponse.json({
    ok: true,
    setupComplete: store.settings.setupComplete,
    settings: publicSettings(store.settings),
    database: sqliteStatus(),
    backend,
    projectCount: store.projects.length,
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    action?: "complete" | "init-db" | "init-backend";
    scanRoots?: string[];
    depth?: number;
    ignore?: string[];
    trashPath?: string;
    cloneRoot?: string;
  };

  const store = readStore();

  if (Array.isArray(body.scanRoots)) {
    store.settings.scanRoots = body.scanRoots.map(expandHome).filter(Boolean);
  }
  if (typeof body.depth === "number") {
    store.settings.depth = Math.min(Math.max(Math.round(body.depth), 1), 3);
  }
  if (Array.isArray(body.ignore)) {
    store.settings.ignore = body.ignore.map((item) => item.trim()).filter(Boolean);
  }
  if (typeof body.trashPath === "string") {
    store.settings.trashPath = expandHome(body.trashPath);
  }
  if (typeof body.cloneRoot === "string") {
    store.settings.cloneRoot = expandHome(body.cloneRoot) || store.settings.cloneRoot;
  }

  try {
    if (body.action === "init-db") {
      store.settings.setupComplete = true;
      const next = initializeSqlite(store);
      return NextResponse.json({
        ok: true,
        settings: publicSettings(next.settings),
        database: sqliteStatus(),
        initialized: "sqlite",
      });
    }

    if (body.action === "init-backend") {
      writeStore(store);
      const result = syncHub("sync");
      const latest = readStore();
      latest.settings.setupComplete = true;
      writeStore(latest);
      return NextResponse.json({
        ok: true,
        ...result,
        settings: publicSettings(latest.settings),
        database: sqliteStatus(),
      });
    }

    store.settings.setupComplete = true;
    writeStore(store);
    return NextResponse.json({
      ok: true,
      settings: publicSettings(store.settings),
      database: sqliteStatus(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Setup failed";
    const status = error instanceof GitError ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
