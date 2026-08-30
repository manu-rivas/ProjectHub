"use client";

import { api } from "@/lib/client";
import type { Column, Project, PublicSettings } from "@/lib/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProjectWorkspace } from "./ProjectWorkspace";

export function ProjectPageClient({ id }: { id: string }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [trashPath, setTrashPath] = useState("");
  const [cloneRoot, setCloneRoot] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [detail, board] = await Promise.all([
          api<{ project: Project }>(`/api/projects/${encodeURIComponent(id)}`),
          api<{ columns: Column[]; settings?: PublicSettings }>("/api/board"),
        ]);
        if (cancelled) return;
        setProject(detail.project);
        setColumns([...board.columns].sort((a, b) => a.order - b.order));
        if (board.settings) {
          setTrashPath(board.settings.trashPath);
          setCloneRoot(board.settings.cloneRoot);
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Project not found");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }

  async function moveProject(projectId: string, columnId: string) {
    try {
      const data = await api<{ project: Project }>("/api/projects", {
        method: "PATCH",
        body: JSON.stringify({ id: projectId, columnId, order: Date.now() }),
      });
      setProject(data.project);
    } catch (caught) {
      flash(caught instanceof Error ? caught.message : "Could not move");
    }
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Project</p>
        <h1 className="mt-2 font-[family-name:var(--font-serif)] text-4xl">Not on the board</h1>
        <p className="mt-3 text-[var(--ink-soft)]">{error}</p>
        <Link className="mt-6 text-[var(--amber)]" href="/">
          ← Back to the studio wall
        </Link>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--ink-soft)]">Opening project…</div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {toast ? (
        <div className="mx-4 mt-3 rounded-md bg-[var(--ink)] px-4 py-2 text-sm text-[var(--paper)]">{toast}</div>
      ) : null}
      <div className="paper-strip mx-3 mb-3 mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
        <ProjectWorkspace
          key={project.id}
          project={project}
          columns={columns}
          trashPath={trashPath}
          cloneRoot={cloneRoot}
          onChange={setProject}
          onMove={(projectId, columnId) => void moveProject(projectId, columnId)}
          onToast={flash}
          onTrashed={(moved, errors) => {
            flash(
              errors.length
                ? `Moved ${moved.length}. Failures: ${errors.join(" · ")}`
                : `Moved to trash: ${moved[0]?.path || project.name}`,
            );
            router.push("/");
          }}
        />
      </div>
    </div>
  );
}
