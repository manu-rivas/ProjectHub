import { NextResponse } from "next/server";
import { probeDependencies } from "@/lib/deps";
import { expandHome } from "@/lib/paths";
import { sqliteStatus } from "@/lib/sqlite";
import { publicSettings, readStore, writeStore } from "@/lib/store";
import { supabaseStatus } from "@/lib/supabase";
import type { StorageBackend } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const store = readStore();
  return NextResponse.json({
    ok: true,
    settings: publicSettings(store.settings),
    database: sqliteStatus(),
    supabase: await supabaseStatus(),
    deps: probeDependencies(),
  });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    scanRoots?: string[];
    depth?: number;
    ignore?: string[];
    trashPath?: string;
    cloneRoot?: string;
    usePortless?: boolean;
    storage?: StorageBackend;
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
  if (typeof body.usePortless === "boolean") {
    store.settings.usePortless = body.usePortless;
  }
  if (body.storage === "json" || body.storage === "sqlite") {
    store.settings.storage = body.storage;
  }
  store.settings.githubToken = "";
  writeStore(store);
  return NextResponse.json({
    ok: true,
    settings: publicSettings(store.settings),
    database: sqliteStatus(),
    supabase: await supabaseStatus(),
    deps: probeDependencies(),
  });
}
