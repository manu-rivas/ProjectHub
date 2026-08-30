import { NextResponse } from "next/server";
import { GitError, pickFolder } from "@/lib/git";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  try {
    const path = pickFolder("Choose the destination folder");
    return NextResponse.json({ ok: true, path });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No folder was chosen";
    const status = error instanceof GitError ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
