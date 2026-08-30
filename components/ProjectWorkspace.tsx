"use client";

import { api } from "@/lib/client";
import { isGitOnly } from "@/lib/project";
import type { Column, DocPreview, Project, ProjectAction, PublishedState } from "@/lib/types";
import { CARD_COLORS } from "@/lib/types";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CloneDialog } from "./CloneDialog";
import { IdeaBoard } from "./IdeaBoard";
import { LocalDeleteConfirm } from "./LocalDeleteConfirm";
import { MarkdownView } from "./MarkdownView";
import { TrashConfirm } from "./TrashConfirm";

type Props = {
  project: Project;
  columns: Column[];
  onChange: (project: Project) => void;
  onMove: (projectId: string, columnId: string) => void;
  onToast: (message: string) => void;
  onTrashed: (projects: Project[], errors: string[]) => void;
  trashPath: string;
  cloneRoot: string;
};

type Tab = "ideas" | "notes" | "docs" | "actions" | string;

type TemplateInfo = { id: string; name: string; description: string };

function publishedLabel(project: Project): string {
  if (project.published === "yes") return "Published";
  if (project.published === "no") return "Not published";
  return project.publishedHint ? "Looks published" : "Unmarked";
}

export function ProjectWorkspace({
  project,
  columns,
  onChange,
  onMove,
  onToast,
  onTrashed,
  trashPath,
  cloneRoot,
}: Props) {
  const [notes, setNotes] = useState(project.notes);
  const [name, setName] = useState(project.name);
  const [docs, setDocs] = useState<DocPreview[]>([]);
  const [actions, setActions] = useState<ProjectAction[]>([]);
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [tab, setTab] = useState<Tab>("ideas");
  const [saving, setSaving] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [templateId, setTemplateId] = useState("web-app");
  const [customLabel, setCustomLabel] = useState("");
  const [customCommand, setCustomCommand] = useState("");
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashing, setTrashing] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [localDeleteOpen, setLocalDeleteOpen] = useState(false);
  const [localDeleting, setLocalDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${project.id}`)
      .then((response) => response.json())
      .then((data: { docs?: DocPreview[]; actions?: ProjectAction[] }) => {
        if (cancelled) return;
        setDocs(data.docs || []);
        setActions(data.actions || []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [project.id, project.path, project.missing]);

  useEffect(() => {
    fetch("/api/templates")
      .then((response) => response.json())
      .then((data: { templates?: TemplateInfo[] }) => {
        if (data.templates?.length) setTemplates(data.templates);
      })
      .catch(() => undefined);
  }, []);

  const activeDoc = useMemo(() => docs.find((doc) => doc.name === tab), [docs, tab]);
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
      onToast(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function open(target: "cursor" | "codex" | "finder" | "vscode" | "terminal") {
    setOpening(target);
    try {
      await api("/api/open", {
        method: "POST",
        body: JSON.stringify({ id: current.id, target }),
      });
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Could not open");
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
      onToast(error instanceof Error ? error.message : "Could not move to trash");
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
      onToast("Local folder deleted. The project stays on the board.");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Could not delete the local folder");
    } finally {
      setLocalDeleting(false);
    }
  }

  async function applyDocs(body: Record<string, unknown>) {
    const result = await api<{ project: Project; docs: DocPreview[]; written: string[] }>(
      `/api/projects/${current.id}/docs`,
      { method: "POST", body: JSON.stringify(body) },
    );
    onChange(result.project);
    setDocs(result.docs);
    return result;
  }

  async function saveDoc() {
    try {
      await applyDocs({ name: tab, content: draft });
      setEditing(false);
      onToast(`Saved ${tab}`);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Could not save the file");
    }
  }

  async function createFromTemplate() {
    try {
      const result = await applyDocs({ templateId, overwrite: false });
      onToast(result.written.length ? `Wrote ${result.written.join(", ")}` : "Those files already exist");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Could not create docs");
    }
  }

  async function runAction(action: ProjectAction) {
    setOpening(action.id);
    try {
      await api(`/api/projects/${current.id}/actions`, {
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

  async function addCustomAction() {
    try {
      const result = await api<{ project: Project; action: ProjectAction }>(`/api/projects/${current.id}/actions`, {
        method: "POST",
        body: JSON.stringify({ action: "add", label: customLabel, command: customCommand }),
      });
      onChange(result.project);
      setActions((currentActions) => {
        const next = currentActions.filter((item) => item.id !== result.action.id);
        return [...next, result.action];
      });
      setCustomLabel("");
      setCustomCommand("");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Could not add the action");
    }
  }

  const onDisk = Boolean(project.path) && !project.missing && !project.trashed;
  const docTabs = docs.length
    ? docs.map((doc) => ({ id: doc.name, label: doc.name.replace(/\.md$/i, ""), badge: doc.exists }))
    : [
        { id: "README.md", label: "README", badge: false },
        { id: "PRODUCT.md", label: "PRODUCT", badge: false },
        { id: "AGENTS.md", label: "AGENTS", badge: false },
      ];

  const tabs: { id: Tab; label: string; badge?: boolean }[] = [
    { id: "ideas", label: "Board", badge: (project.ideas?.cards.length || 0) > 0 },
    { id: "notes", label: "Notes" },
    { id: "actions", label: "Actions", badge: actions.length > 0 },
    ...docTabs,
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-[var(--rule)] px-6 py-5">
        <Link href="/" className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--amber)]">
          ← Studio wall
        </Link>
        <input
          className="mt-2 w-full bg-transparent font-[family-name:var(--font-serif)] text-4xl outline-none"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => name.trim() && name !== project.name && save({ name: name.trim() })}
        />
        <p className="mt-1 break-all font-mono text-[12px] text-[var(--ink-soft)]">
          {project.path || project.remoteUrl || "No local folder"}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-1.5" aria-label="Card color">
          <button
            type="button"
            className={`h-6 w-6 rounded-full border-2 ${!project.color ? "scale-110 border-[var(--ink)] ring-2 ring-[var(--amber)] ring-offset-1" : "border-[var(--rule)]"}`}
            style={{ background: "var(--card)" }}
            aria-label="No color"
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
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
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
              {value === "unset" ? "Auto" : value === "yes" ? "Published" : "Local only"}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          {publishedLabel(project)}
          {project.remoteUrl ? ` · ${project.remoteUrl}` : " · no remote"}
        </p>
        {isGitOnly(project) ? (
          <p className="mt-3 max-w-2xl rounded-md bg-[var(--paper-deep)] px-3 py-2 text-sm text-[var(--ink-soft)]">
            Not on this machine. Clone it with GitHub CLI (`gh repo clone`) when you want a local copy.
          </p>
        ) : null}
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-[var(--rule)] px-4 pt-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            className={`rounded-t-md px-4 py-2 text-sm ${
              tab === item.id ? "bg-[var(--card)] font-semibold" : "text-[var(--ink-soft)]"
            }`}
            onClick={() => {
              setTab(item.id);
              setEditing(false);
              const doc = docs.find((entry) => entry.name === item.id);
              setDraft(doc?.excerpt || "");
            }}
            type="button"
          >
            {item.label}
            {item.badge ? <span className="ml-1 text-[var(--moss)]">●</span> : null}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {tab === "ideas" ? (
          <IdeaBoard project={project} onChange={onChange} onToast={onToast} />
        ) : tab === "notes" ? (
          <div className="mx-auto flex h-full min-h-64 max-w-3xl flex-col">
            <div className="mb-2 flex justify-end">
              <button
                className="text-sm text-[var(--amber)]"
                disabled={saving || notes === project.notes}
                onClick={() => save({ notes })}
              >
                {saving ? "Saving…" : "Save notes"}
              </button>
            </div>
            <textarea
              className="notes min-h-64 w-full flex-1 resize-none rounded-md border border-[var(--rule)] bg-[var(--card)] p-3"
              placeholder="What this was, where you left it, links, decisions…"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        ) : tab === "actions" ? (
          <div className="mx-auto max-w-3xl space-y-3">
            <p className="text-sm text-[var(--ink-soft)]">
              Start the project, open a tool, or add your own command. Commands run from the project folder.
            </p>
            <div className="flex flex-wrap gap-2">
              {actions.length === 0 ? <p className="text-sm text-[var(--ink-soft)]">No scripts detected yet.</p> : null}
              {actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="rounded-md bg-[var(--ink)] px-3 py-2 text-sm text-[var(--paper)] disabled:opacity-40"
                  disabled={!onDisk || opening === action.id}
                  onClick={() => void runAction(action)}
                >
                  {opening === action.id ? "…" : action.label}
                </button>
              ))}
            </div>
            <form
              className="rounded-md border border-[var(--rule)] p-3"
              onSubmit={(event) => {
                event.preventDefault();
                void addCustomAction();
              }}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Custom action</p>
              <input
                className="mt-2 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2 text-sm"
                placeholder="Label · Start API"
                value={customLabel}
                onChange={(event) => setCustomLabel(event.target.value)}
              />
              <input
                className="mt-2 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2 font-mono text-sm"
                placeholder="pnpm --filter api dev"
                value={customCommand}
                onChange={(event) => setCustomCommand(event.target.value)}
              />
              <button className="mt-2 rounded-md border border-[var(--ink)] px-3 py-1 text-sm" type="submit" disabled={!customCommand.trim()}>
                Add action
              </button>
            </form>
          </div>
        ) : activeDoc?.exists ? (
          <div className="mx-auto max-w-3xl">
            <div className="mb-3 flex justify-end gap-3">
              <button
                className="text-sm text-[var(--amber)]"
                type="button"
                onClick={() => {
                  setDraft(activeDoc.excerpt || "");
                  setEditing((currentEdit) => !currentEdit);
                }}
              >
                {editing ? "Preview" : "Edit"}
              </button>
              {editing ? (
                <button className="text-sm text-[var(--moss)]" type="button" onClick={() => void saveDoc()}>
                  Save file
                </button>
              ) : null}
            </div>
            {editing ? (
              <textarea
                className="notes min-h-80 w-full resize-y rounded-md border border-[var(--rule)] bg-[var(--card)] p-3 font-mono text-sm"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
            ) : (
              <MarkdownView markdown={activeDoc.excerpt || ""} projectId={project.id} />
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-3 text-sm">
            <p className="text-[var(--ink-soft)]">
              {tab} is not in the project root yet. Create it from a template, or write it here.
            </p>
            {onDisk ? (
              <>
                <label className="block">
                  Template
                  <select
                    className="mt-1 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2"
                    value={templateId}
                    onChange={(event) => setTemplateId(event.target.value)}
                  >
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="rounded-md bg-[var(--ink)] px-3 py-2 text-[var(--paper)]" type="button" onClick={() => void createFromTemplate()}>
                  Create docs from template
                </button>
                <textarea
                  className="notes min-h-48 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] p-3 font-mono text-sm"
                  placeholder={`# ${project.name}`}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <button
                  className="rounded-md border border-[var(--ink)] px-3 py-2"
                  type="button"
                  disabled={!draft.trim()}
                  onClick={() => void saveDoc()}
                >
                  Create {tab}
                </button>
              </>
            ) : (
              <p className="text-[var(--ink-soft)]">Clone with GitHub CLI or create a local folder first.</p>
            )}
          </div>
        )}
      </div>

      <footer className="grid grid-cols-3 gap-2 border-t border-[var(--rule)] bg-[var(--paper-deep)] px-6 py-3 sm:grid-cols-6">
        <button className="rounded-md bg-[var(--ink)] py-2 text-[var(--paper)] disabled:opacity-40" onClick={() => open("cursor")} disabled={!onDisk}>
          {opening === "cursor" ? "…" : "Cursor"}
        </button>
        <button className="rounded-md border border-[var(--ink)] py-2 disabled:opacity-40" onClick={() => open("vscode")} disabled={!onDisk}>
          {opening === "vscode" ? "…" : "VS Code"}
        </button>
        <button className="rounded-md bg-[var(--amber)] py-2 text-white disabled:opacity-40" onClick={() => open("codex")} disabled={!onDisk}>
          {opening === "codex" ? "…" : "Codex"}
        </button>
        <button className="rounded-md border border-[var(--ink)] py-2 disabled:opacity-40" onClick={() => open("finder")} disabled={!onDisk}>
          {opening === "finder" ? "…" : "Folder"}
        </button>
        <button className="rounded-md border border-[var(--ink)] py-2 disabled:opacity-40" onClick={() => open("terminal")} disabled={!onDisk}>
          {opening === "terminal" ? "…" : "Terminal"}
        </button>
        <button className="rounded-md border border-[var(--moss)] py-2 disabled:opacity-40" onClick={() => setTab("actions")} disabled={!onDisk}>
          Start
        </button>
        {project.remoteUrl ? (
          <button className="col-span-3 rounded-md border border-[var(--moss)] py-2 text-sm sm:col-span-6" type="button" onClick={() => setCloneOpen(true)}>
            {onDisk ? "Clone again…" : "Bring to this machine…"}
          </button>
        ) : null}
        {onDisk ? (
          <button className="col-span-3 rounded-md border border-[var(--ink)] py-2 text-sm sm:col-span-6" type="button" onClick={() => setLocalDeleteOpen(true)}>
            Delete local folder…
          </button>
        ) : null}
        {project.trashed ? (
          <p className="col-span-3 text-center text-xs text-[var(--clay)] sm:col-span-6">In trash · {project.path}</p>
        ) : onDisk ? (
          <button className="col-span-3 text-sm text-[var(--clay)] sm:col-span-6" type="button" onClick={() => setTrashOpen(true)}>
            Move to trash…
          </button>
        ) : (
          <p className="col-span-3 text-center text-xs text-[var(--ink-soft)] sm:col-span-6">
            No local folder{project.remoteUrl ? " · it lives on Git" : ""}. Trash does not apply.
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
            onToast(`Cloned to ${next.path}`);
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
    </div>
  );
}
