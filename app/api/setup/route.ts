import { NextResponse } from "next/server";
import { probeDependencies } from "@/lib/deps";
import { GitError } from "@/lib/git";
import { expandHome } from "@/lib/paths";
import { readSecrets, supabaseConfigured, writeSecrets } from "@/lib/secrets";
import { sqliteStatus } from "@/lib/sqlite";
import { initializeSqlite, publicSettings, readStore, setStorageBackend, writeStore } from "@/lib/store";
import { supabaseBootstrapSql, supabaseStatus, SupabaseError, writeSupabaseStore } from "@/lib/supabase";
import { resolveSyncRepo, syncHub } from "@/lib/sync";
import type { StorageBackend } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function applyFolderSettings(
  store: ReturnType<typeof readStore>,
  body: {
    scanRoots?: string[];
    depth?: number;
    ignore?: string[];
    trashPath?: string;
    cloneRoot?: string;
    usePortless?: boolean;
  },
) {
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
  if (typeof body.usePortless === "boolean") {
    store.settings.usePortless = body.usePortless;
  }
}

async function backendPayload() {
  const store = readStore();
  let github: { ok: boolean; repo: string; error?: string } = { ok: false, repo: "" };
  try {
    github = { ok: true, repo: resolveSyncRepo() };
  } catch (error) {
    github = { ok: false, repo: "", error: error instanceof Error ? error.message : "gh is not authenticated" };
  }
  return {
    ok: true,
    setupComplete: store.settings.setupComplete,
    settings: publicSettings(store.settings),
    database: sqliteStatus(),
    supabase: await supabaseStatus(),
    supabaseSql: supabaseBootstrapSql(),
    github,
    deps: probeDependencies(),
    projectCount: store.projects.length,
  };
}

export async function GET() {
  return NextResponse.json(await backendPayload());
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    action?: "complete" | "init-db" | "init-backend" | "init-supabase" | "set-backend";
    scanRoots?: string[];
    depth?: number;
    ignore?: string[];
    trashPath?: string;
    cloneRoot?: string;
    usePortless?: boolean;
    storage?: StorageBackend;
    supabaseUrl?: string;
    supabaseKey?: string;
  };

  const store = readStore();
  applyFolderSettings(store, body);

  try {
    if (body.action === "init-db" || body.storage === "sqlite") {
      store.settings.setupComplete = true;
      const next = initializeSqlite(store);
      return NextResponse.json({ ...(await backendPayload()), settings: publicSettings(next.settings), initialized: "sqlite" });
    }

    if (body.action === "init-backend" || body.storage === "github") {
      store.settings.storage = "github";
      writeStore(store);
      const result = syncHub("sync");
      const latest = readStore();
      latest.settings.setupComplete = true;
      latest.settings.storage = "github";
      writeStore(latest);
      return NextResponse.json({
        ...(await backendPayload()),
        ...result,
        initialized: "github",
      });
    }

    if (body.action === "init-supabase" || body.storage === "supabase") {
      if (body.supabaseUrl || body.supabaseKey) {
        writeSecrets({
          supabaseUrl: body.supabaseUrl ?? readSecrets().supabaseUrl,
          supabaseKey: body.supabaseKey ?? readSecrets().supabaseKey,
        });
      }
      if (!supabaseConfigured()) {
        return NextResponse.json({ ok: false, error: "Supabase URL and service role key are required" }, { status: 400 });
      }
      store.settings.storage = "supabase";
      store.settings.setupComplete = true;
      writeStore(store);
      await writeSupabaseStore(readStore());
      return NextResponse.json({ ...(await backendPayload()), initialized: "supabase" });
    }

    if (body.action === "set-backend" && body.storage) {
      store.settings.setupComplete = true;
      const next = setStorageBackend(store, body.storage);
      return NextResponse.json({ ...(await backendPayload()), settings: publicSettings(next.settings) });
    }

    store.settings.setupComplete = true;
    if (body.storage) store.settings.storage = body.storage;
    writeStore(store);
    return NextResponse.json(await backendPayload());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Setup failed";
    const status = error instanceof GitError || error instanceof SupabaseError ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
