"use client";

import { api } from "@/lib/client";
import type { Column, DocPreview, Project, PublishedState } from "@/lib/types";
import { CARD_COLORS } from "@/lib/types";
import { isGitOnly } from "@/lib/project";
import { useEffect, useMemo, useState } from "react";
import { CloneDialog } from "./CloneDialog";
import { IdeaBoard } from "./IdeaBoard";
import { LocalDeleteConfirm } from "./LocalDeleteConfirm";
import { MarkdownView } from "./MarkdownView";
import { TrashConfirm } from "./TrashConfirm";

type Props = {
  project: Project | null;
  columns: Column[];
  onChange: (project: Project) => void;
  onMove: (projectId: string, columnId: string) => void;
  onToast: (message: string) => void;
  onTrashed: (projects: Project[], errors: string[]) => void;
  trashPath: string;
  cloneRoot: string;
};

type Tab = "ideas" | "notas" | "README.md" | "PRODUCT.md" | "AGENTS.md";

function publishedLabel(project: Project): string {
  if (project.published === "yes") return "Publicado";
  if (project.published === "no") return "No publicado";
  return project.publishedHint ? "Parece publicado" : "Sin marcar";
}

export function ProjectPane({ project, columns, onChange, onMove, onToast, onTrashed, trashPath, cloneRoot }: Props) {
  const [notes, setNotes] = useState(project?.notes ?? "");
  const [name, setName] = useState(project?.name ?? "");
  const [docs, setDocs] = useState<DocPreview[]>([]);
  const [tab, setTab] = useState<Tab>("notas");
  const [saving, setSaving] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashing, setTrashing] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [localDeleteOpen, setLocalDeleteOpen] = useState(false);
  const [localDeleting, setLocalDeleting] = useState(false);

  useEffect(() => {
    setNotes(project?.notes ?? "");
    setName(project?.name ?? "");
    setTab("ideas");
    setTrashOpen(false);
    setCloneOpen(false);
    setLocalDeleteOpen(false);
    if (!project) {
      setDocs([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/projects/${project.id}`)
      .then((response) => response.json())
      .then((data: { docs?: DocPreview[] }) => {
        if (cancelled) return;
        const next = data.docs || [];
        setDocs(next);
        const firstDoc = next.find((doc) => doc.exists);
        if (!firstDoc) setTab("ideas");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [project?.id]);

  const activeDoc = useMemo(() => docs.find((doc) => doc.name === tab), [docs, tab]);

  if (!project) {
    return (
      <aside className="doc-pane flex w-[min(42vw,34rem)] shrink-0 flex-col">
        <div className="flex h-full flex-col items-start justify-center px-8 text-[var(--ink-soft)]">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em]">Documentación</p>
          <p className="mt-3 font-[family-name:var(--font-serif)] text-3xl text-[var(--ink)]">Elige una ficha</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed">
            Pulsa un proyecto para leer su README, PRODUCT o AGENTS aquí mismo. Arrastra la tarjeta a otra columna para
            cambiar el estado.
          </p>
        </div>
      </aside>
    );
  }

  const current = project;

  async function save(patch: Partial<Project>) {
    setSaving(true);
    try {
      const result = await api<{ project: Project }>("/api/projects", {
        method: "PATCH",
        body: JSON.stringify({ id: current.id, ...patch }),
      });
      onChange(result.project);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  async function open(target: "cursor" | "codex" | "finder") {
    setOpening(target);
    try {
      await api("/api/open", {
        method: "POST",
        body: JSON.stringify({ id: current.id, target }),
      });
    } catch (error) {
      onToast(error instanceof Error ? error.message : "No se pudo abrir");
    } finally {
      setOpening(null);
    }
  }

  async function sendToTrash(payload: { confirmName: string; confirmCount: number; confirmPhrase: string }) {
    setTrashing(true);
    try {
      const result = await api<{ moved: Project[]; errors: string[] }>("/api/projects/trash", {
        method: "POST",
        body: JSON.stringify({
          ids: [current.id],
          confirmName: payload.confirmName,
          confirmCount: payload.confirmCount,
          confirmPhrase: payload.confirmPhrase,
        }),
      });
      setTrashOpen(false);
      onTrashed(result.moved, result.errors || []);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "No se pudo mover a la papelera");
    } finally {
      setTrashing(false);
    }
  }

  async function deleteLocal(confirmName: string) {
    setLocalDeleting(true);
    try {
      const result = await api<{ project: Project }>("/api/projects/local-delete", {
        method: "POST",
        body: JSON.stringify({ id: current.id, confirmName }),
      });
      setLocalDeleteOpen(false);
      onChange(result.project);
      onToast("Carpeta local borrada. El proyecto sigue en el tablero.");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "No se pudo borrar en local");
    } finally {
      setLocalDeleting(false);
    }
  }

  const onDisk = Boolean(project.path) && !project.missing && !project.trashed;

  const tabs: { id: Tab; label: string; badge?: boolean }[] = [
    { id: "ideas", label: "Ideas", badge: (project.ideas?.cards.length || 0) > 0 },
    { id: "notas", label: "Notas" },
    { id: "README.md", label: "README", badge: Boolean(docs.find((doc) => doc.name === "README.md")?.exists) },
    { id: "PRODUCT.md", label: "PRODUCT", badge: Boolean(docs.find((doc) => doc.name === "PRODUCT.md")?.exists) },
    { id: "AGENTS.md", label: "AGENTS", badge: Boolean(docs.find((doc) => doc.name === "AGENTS.md")?.exists) },
  ];

  return (
    <aside className="doc-pane flex w-[min(42vw,34rem)] shrink-0 flex-col">
      <header className="border-b border-[var(--rule)] px-5 py-4">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[var(--ink-soft)]">En esta ventana</p>
        <input
          className="mt-1 w-full bg-transparent font-[family-name:var(--font-serif)] text-2xl outline-none"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => name.trim() && name !== project.name && save({ name: name.trim() })}
        />
        <p className="mt-1 break-all font-mono text-[11px] text-[var(--ink-soft)]">
          {project.path || project.remoteUrl || "Sin carpeta local"}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Color de la ficha">
          <button
            type="button"
            className={`h-6 w-6 rounded-full border-2 ${!project.color ? "scale-110 border-[var(--ink)] ring-2 ring-[var(--amber)] ring-offset-1" : "border-[var(--rule)]"}`}
            style={{ background: "var(--card)" }}
            aria-label="Sin color"
            aria-pressed={!project.color}
            onClick={() => save({ color: null })}
          />
          {CARD_COLORS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`h-6 w-6 rounded-full border-2 ${project.color === item.id ? "scale-110 border-[var(--ink)] ring-2 ring-[var(--amber)] ring-offset-1" : "border-white/70"}`}
              style={{ background: item.swatch }}
              aria-label={item.label}
              aria-pressed={project.color === item.id}
              onClick={() => save({ color: item.id })}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
            Columna
            <select
              className="ml-2 rounded-full border border-[var(--rule)] bg-[var(--card)] px-2 py-1 font-sans text-sm font-normal normal-case tracking-normal"
              value={project.columnId}
              onChange={(event) => onMove(project.id, event.target.value)}
            >
              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.title}
                </option>
              ))}
            </select>
          </label>
          {(["unset", "yes", "no"] as PublishedState[]).map((value) => (
            <button
              key={value}
              className={`rounded-full border px-2 py-1 text-xs ${
                project.published === value
                  ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]"
                  : "border-[var(--rule)]"
              }`}
              onClick={() => save({ published: value })}
            >
              {value === "unset" ? "Auto" : value === "yes" ? "Sí pub." : "No pub."}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-[var(--ink-soft)]">
          {publishedLabel(project)}
          {project.remoteUrl ? ` · ${project.remoteUrl}` : " · sin remoto"}
        </p>
        {isGitOnly(project) ? (
          <p className="mt-2 rounded-md bg-[var(--paper-deep)] px-3 py-2 text-xs text-[var(--ink-soft)]">
            No está en este Mac. El tablero lo recuerda; tráelo a local cuando quieras.
          </p>
        ) : null}
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-[var(--rule)] px-3 pt-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            className={`rounded-t-md px-3 py-2 text-sm ${
              tab === item.id ? "bg-[var(--card)] font-semibold" : "text-[var(--ink-soft)]"
            }`}
            onClick={() => setTab(item.id)}
            type="button"
          >
            {item.label}
            {item.badge ? <span className="ml-1 text-[var(--moss)]">●</span> : null}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {tab === "ideas" ? (
          <IdeaBoard project={project} onChange={onChange} onToast={onToast} />
        ) : tab === "notas" ? (
          <div className="flex h-full min-h-64 flex-col">
            <div className="mb-2 flex justify-end">
              <button
                className="text-sm text-[var(--amber)]"
                disabled={saving || notes === project.notes}
                onClick={() => save({ notes })}
              >
                {saving ? "Guardando…" : "Guardar notas"}
              </button>
            </div>
            <textarea
              className="notes min-h-64 w-full flex-1 resize-none rounded-md border border-[var(--rule)] bg-[var(--card)] p-3"
              placeholder="Qué era esto, por dónde lo dejaste, enlaces, decisiones…"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        ) : activeDoc?.exists ? (
          <MarkdownView markdown={activeDoc.excerpt || ""} projectId={project.id} />
        ) : (
          <p className="text-sm text-[var(--ink-soft)]">
            {tab} no está en la raíz de este proyecto. Si lo creas, pulsa la ficha otra vez para recargarlo.
          </p>
        )}
      </div>

      <footer className="grid grid-cols-3 gap-2 border-t border-[var(--rule)] bg-[var(--paper-deep)] px-5 py-3">
        <button className="rounded-md bg-[var(--ink)] py-2 text-[var(--paper)] disabled:opacity-40" onClick={() => open("cursor")} disabled={!onDisk}>
          {opening === "cursor" ? "…" : "Cursor"}
        </button>
        <button className="rounded-md bg-[var(--amber)] py-2 text-white disabled:opacity-40" onClick={() => open("codex")} disabled={!onDisk}>
          {opening === "codex" ? "…" : "Codex"}
        </button>
        <button className="rounded-md border border-[var(--ink)] py-2 disabled:opacity-40" onClick={() => open("finder")} disabled={!onDisk}>
          {opening === "finder" ? "…" : "Finder"}
        </button>
        {project.remoteUrl ? (
          <button className="col-span-3 rounded-md border border-[var(--moss)] py-2 text-sm" type="button" onClick={() => setCloneOpen(true)}>
            {onDisk ? "Clonar otra vez…" : "Traer a local…"}
          </button>
        ) : null}
        {onDisk ? (
          <button className="col-span-3 rounded-md border border-[var(--ink)] py-2 text-sm" type="button" onClick={() => setLocalDeleteOpen(true)}>
            Borrar carpeta local…
          </button>
        ) : null}
        {project.trashed ? (
          <p className="col-span-3 text-center text-xs text-[var(--clay)]">En papelera · {project.path}</p>
        ) : onDisk ? (
          <button className="col-span-3 text-sm text-[var(--clay)]" type="button" onClick={() => setTrashOpen(true)}>
            Enviar a la papelera…
          </button>
        ) : (
          <p className="col-span-3 text-center text-xs text-[var(--ink-soft)]">
            Sin carpeta local{project.remoteUrl ? " · está en Git" : ""}. La papelera no aplica.
          </p>
        )}
      </footer>
      {trashOpen ? (
        <TrashConfirm
          projects={[project]}
          trashPath={trashPath}
          busy={trashing}
          onCancel={() => setTrashOpen(false)}
          onConfirm={(payload) => void sendToTrash(payload)}
        />
      ) : null}
      {cloneOpen && project.remoteUrl ? (
        <CloneDialog
          name={project.name}
          projectId={project.id}
          url={project.remoteUrl}
          defaultParent={cloneRoot}
          onClose={() => setCloneOpen(false)}
          onCloned={(next) => {
            setCloneOpen(false);
            onChange(next);
            onToast(`Clonado en ${next.path}`);
          }}
          onToast={onToast}
        />
      ) : null}
      {localDeleteOpen ? (
        <LocalDeleteConfirm
          project={project}
          busy={localDeleting}
          onCancel={() => setLocalDeleteOpen(false)}
          onConfirm={(confirmName) => void deleteLocal(confirmName)}
        />
      ) : null}
    </aside>
  );
}
