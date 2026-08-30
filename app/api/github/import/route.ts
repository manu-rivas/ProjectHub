import { NextResponse } from "next/server";
import { ensureRemoteOnBoard } from "@/lib/catalog";
import { GitError, listGithubRepos } from "@/lib/git";
import { publicSettings, readStore, writeStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const store = readStore();
    const repos = await listGithubRepos();
    let added = 0;
    for (const repo of repos) {
      const result = ensureRemoteOnBoard(store, repo.url, {
        name: repo.name,
        notes: repo.description,
        source: "github",
      });
      if (result.created) added += 1;
    }
    writeStore(store);
    return NextResponse.json({
      ok: true,
      added,
      total: repos.length,
      catalog: store.catalog,
      projects: store.projects,
      columns: [...store.columns].sort((a, b) => a.order - b.order),
      settings: publicSettings(store.settings),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read GitHub";
    const status = error instanceof GitError ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
