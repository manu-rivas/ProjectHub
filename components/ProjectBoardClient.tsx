"use client";

import { api } from "@/lib/client";
import type { Project } from "@/lib/types";
import { useEffect, useState } from "react";
import { IdeaBoard } from "./IdeaBoard";

export function ProjectBoardClient({ id }: { id: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ project: Project }>(`/api/projects/${encodeURIComponent(id)}`)
      .then((data) => {
        if (!cancelled) setProject(data.project);
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Project not found");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
        <p className="text-[var(--ink-soft)]">{error}</p>
      </div>
    );
  }

  if (!project) {
    return <div className="flex min-h-screen items-center justify-center text-[var(--ink-soft)]">Opening board…</div>;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--paper)]">
      {toast ? <div className="mx-4 mt-3 rounded-md bg-[var(--ink)] px-4 py-2 text-sm text-[var(--paper)]">{toast}</div> : null}
      <header className="flex items-center gap-3 px-5 py-3">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Board</p>
        <h1 className="font-[family-name:var(--font-serif)] text-2xl">{project.name}</h1>
      </header>
      <div className="min-h-0 flex-1 px-4 pb-4">
        <IdeaBoard project={project} onChange={setProject} onToast={flash} fullScreen />
      </div>
    </div>
  );
}
