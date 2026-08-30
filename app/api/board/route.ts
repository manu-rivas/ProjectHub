import { NextResponse } from "next/server";
import { withProjectIcon } from "@/lib/icon";
import { publicSettings, readStore, writeStore } from "@/lib/store";
import { reconcileTrashState } from "@/lib/trash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const store = readStore();
  if (reconcileTrashState(store)) writeStore(store);
  return NextResponse.json({
    ok: true,
    settings: publicSettings(store.settings),
    columns: [...store.columns].sort((a, b) => a.order - b.order),
    projects: store.projects.map(withProjectIcon),
  });
}
