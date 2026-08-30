"use client";

import { api } from "@/lib/client";
import { isHexColor, toHex6 } from "@/lib/color";
import { isGitOnly } from "@/lib/project";
import type { Column, Project, ProjectAction } from "@/lib/types";
import { CARD_COLORS } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CloneDialog } from "./CloneDialog";
import { ProjectMark } from "./ProjectMark";

export function ProjectQuickPane({
  project,
  columns,
  cloneRoot,
  onChange,
  onMove,
  onToast,
  onClose,
}: {
  project: Project | null;
  columns: Column[];
  cloneRoot: string;
  onChange: (project: Project) => void;
  onMove: (projectId: string, columnId: string) => void;
  onToast: (message: string) => void;
  onClose: () => void;
}) {
  if (!project) {
    return (
      <aside className="doc-pane flex w-[min(24rem,38vw)] shrink-0 flex-col">
        <div className="flex h-full flex-col items-start justify-center px-6 text-[var(--ink-soft)]">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em]">Quick pane</p>
          <p className="mt-3 font-[family-name:var(--font-serif)] text-3xl text-[var(--ink)]">Pick a card</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed">
            Open tools from here. The full project page keeps the board, notes, and docs.
          </p>
        </div>
      </aside>
    );
  }

  return <QuickPaneBody key={project.id} project={project} columns={columns} cloneRoot={cloneRoot} onChange={onChange} onMove={onMove} onToast={onToast} onClose={onClose} />;
}

function QuickPaneBody({
  project,
  columns,
  cloneRoot,
  onChange,
  onMove,
  onToast,
  onClose,
}: {
  project: Project;
  columns: Column[];
  cloneRoot: string;
  onChange: (project: Project) => void;
  onMove: (projectId: string, columnId: string) => void;
  onToast: (message: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(project.name);
  const [actions, setActions] = useState<ProjectAction[]>([]);
  const [opening, setOpening] = useState<string | null>(null);
  const [cloneOpen, setCloneOpen] = useState(false);

  useEffect(() => {
    if (!project.path || project.missing) return;
    let cancelled = false;
    fetch(`/api/projects/${project.id}`)
      .then((response) => response.json())
      .then((data: { actions?: ProjectAction[] }) => {
        if (!cancelled) setActions(data.actions || []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [project.id, project.path, project.missing]);

  const onDisk = Boolean(project.path) && !project.missing && !project.trashed;
  const href = `/projects/${encodeURIComponent(project.id)}`;

  async function save(patch: Partial<Project>) {
    try {
      const result = await api<{ project: Project }>("/api/projects", {
        method: "PATCH",
        body: JSON.stringify({ id: project.id, ...patch }),
      });
      onChange(result.project);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Could not save");
    }
  }

  async function open(target: "cursor" | "codex" | "finder" | "vscode" | "terminal") {
    setOpening(target);
    try {
      await api("/api/open", {
        method: "POST",
        body: JSON.stringify({ id: project.id, target }),
      });
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Could not open");
    } finally {
      setOpening(null);
    }
  }

  async function runAction(action: ProjectAction) {
    setOpening(action.id);
    try {
      await api(`/api/projects/${project.id}/actions`, {
        method: "POST",
        body: JSON.stringify({ action: "run", actionId: action.id, command: action.command }),
      });
      onToast(`Started: ${action.label}`);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Could not run the action");
    } finally {
      setOpening(null);
    }
  }

  return (
    <aside className="doc-pane flex w-[min(24rem,38vw)] shrink-0 flex-col">
      <header className="border-b border-[var(--rule)] px-5 py-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Quick pane</p>
          <button className="text-sm text-[var(--ink-soft)]" type="button" onClick={onClose} aria-label="Close pane">
            ×
          </button>
        </div>
        <div className="mt-3 flex items-start gap-3">
          <ProjectMark project={project} size="sm" />
          <div className="min-w-0 flex-1">
            <input
              className="w-full bg-transparent font-[family-name:var(--font-serif)] text-2xl outline-none"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => name.trim() && name !== project.name && save({ name: name.trim() })}
            />
            <p className="mt-1 break-all font-mono text-[11px] text-[var(--ink-soft)]">
              {project.path || project.remoteUrl || "No local folder"}
            </p>
          </div>
        </div>
        <Link
          className="mt-4 flex w-full items-center justify-center rounded-md bg-[var(--ink)] px-3 py-2 text-sm text-[var(--paper)]"
          href={href}
        >
          Open project page
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-1.5" aria-label="Card color">
          <button
            type="button"
            className={`h-5 w-5 rounded-full border-2 ${!project.color ? "border-[var(--ink)]" : "border-[var(--rule)]"}`}
            style={{ background: "var(--card)" }}
            aria-label="No color"
            onClick={() => save({ color: null })}
          />
          {CARD_COLORS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`h-5 w-5 rounded-full border-2 ${project.color === item.id ? "border-[var(--ink)]" : "border-white/70"}`}
              style={{ background: item.swatch }}
              aria-label={item.label}
              onClick={() => save({ color: item.id })}
            />
          ))}
          <input
            className="h-6 w-8 cursor-pointer rounded border border-[var(--rule)] bg-transparent p-0"
            type="color"
            value={isHexColor(project.color) ? toHex6(project.color) : "#c4782a"}
            aria-label="Custom color"
            onChange={(event) => save({ color: event.target.value })}
          />
        </div>
        <label className="mt-3 block text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
          Column
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
        {isGitOnly(project) ? (
          <p className="mt-3 rounded-md bg-[var(--paper-deep)] px-3 py-2 text-xs text-[var(--ink-soft)]">
            Not on this machine. Clone it, or open the project page for the rest.
          </p>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Open</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button className="rounded-md bg-[var(--ink)] py-2 text-sm text-[var(--paper)] disabled:opacity-40" onClick={() => open("cursor")} disabled={!onDisk}>
            {opening === "cursor" ? "…" : "Cursor"}
          </button>
          <button className="rounded-md border border-[var(--ink)] py-2 text-sm disabled:opacity-40" onClick={() => open("vscode")} disabled={!onDisk}>
            {opening === "vscode" ? "…" : "VS Code"}
          </button>
          <button className="rounded-md bg-[var(--amber)] py-2 text-sm text-white disabled:opacity-40" onClick={() => open("codex")} disabled={!onDisk}>
            {opening === "codex" ? "…" : "Codex"}
          </button>
          <button className="rounded-md border border-[var(--ink)] py-2 text-sm disabled:opacity-40" onClick={() => open("finder")} disabled={!onDisk}>
            {opening === "finder" ? "…" : "Folder"}
          </button>
          <button className="rounded-md border border-[var(--ink)] py-2 text-sm disabled:opacity-40" onClick={() => open("terminal")} disabled={!onDisk}>
            {opening === "terminal" ? "…" : "Terminal"}
          </button>
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Start</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {actions.length === 0 ? (
            <p className="text-sm text-[var(--ink-soft)]">No scripts yet. Add them on the project page.</p>
          ) : (
            actions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="rounded-md bg-[var(--ink)] px-3 py-2 text-sm text-[var(--paper)] disabled:opacity-40"
                disabled={!onDisk || opening === action.id}
                onClick={() => void runAction(action)}
              >
                {opening === action.id ? "…" : action.label}
              </button>
            ))
          )}
        </div>
        {project.remoteUrl ? (
          <button
            className="mt-4 w-full rounded-md border border-[var(--moss)] py-2 text-sm"
            type="button"
            onClick={() => setCloneOpen(true)}
          >
            {onDisk ? "Clone again…" : "Bring to this machine…"}
          </button>
        ) : null}
      </div>

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
            onToast(`Cloned to ${next.path}`);
          }}
          onToast={onToast}
        />
      ) : null}
    </aside>
  );
}
