import { NextResponse } from "next/server";
import { runScan } from "@/lib/scan";
import { publicSettings } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const { store, added, updated, missing } = runScan();
  return NextResponse.json({
    ok: true,
    added,
    updated,
    missing,
    settings: publicSettings(store.settings),
    columns: [...store.columns].sort((a, b) => a.order - b.order),
    projects: store.projects,
  });
}
