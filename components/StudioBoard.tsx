"use client";

import { api } from "@/lib/client";
import type { Column, Project, PublicSettings } from "@/lib/types";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { SetupWizard } from "./SetupWizard";
import { TrashConfirm } from "./TrashConfirm";
import { hasLocalCopy, isGitOnly } from "@/lib/project";

type BoardResponse = {
  columns: Column[];
  projects: Project[];
  settings?: PublicSettings;
};

const collisionDetection: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  if (pointer.length > 0) return pointer;
  const rects = rectIntersection(args);
  if (rects.length > 0) return rects;
  return closestCorners(args);
};

function isLive(project: Project): boolean {
  if (project.published === "yes") return true;
  if (project.published === "no") return false;
  return project.publishedHint;
}

function CardFace({
  project,
  active,
  checked,
  dragging,
}: {
  project: Project;
  active?: boolean;
  checked?: boolean;
  dragging?: boolean;
}) {
  const gitOnly = isGitOnly(project);
  const tint = project.color ? `index-card-tint-${project.color}` : "";
  return (
    <article
      className={`index-card cursor-grab rounded-md p-3 active:cursor-grabbing ${tint} ${gitOnly ? "index-card-gitonly" : ""} ${active ? "index-card-active" : ""} ${checked ? "index-card-checked" : ""} ${dragging ? "opacity-40" : ""}`}
      aria-disabled={gitOnly || undefined}
    >
      <h3 className="pr-4 font-[family-name:var(--font-serif)] text-lg leading-tight">{project.name}</h3>
      <p className="mt-1 truncate font-mono text-[11px] text-[var(--ink-soft)]">
        {gitOnly ? project.remoteUrl || "Git only" : project.path || project.remoteUrl || "No local folder"}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {project.trashed ? <span className="chip chip-gone">Trash</span> : null}
        {gitOnly ? (
          <span className="chip chip-gone">Not local</span>
        ) : isLive(project) ? (
          <span className="chip chip-live">Published</span>
        ) : (
          <span className="chip chip-draft">Local</span>
        )}
        {project.remoteUrl && !gitOnly ? <span className="chip chip-live">Git</span> : null}
        {project.docs.length > 0 ? <span className="chip chip-draft">{project.docs.length} docs</span> : null}
        {(project.ideas?.cards.length || 0) > 0 ? (
          <span className="chip chip-draft">{project.ideas.cards.length} ideas</span>
        ) : null}
        {project.missing && !project.remoteUrl ? <span className="chip chip-gone">Missing</span> : null}
      </div>
    </article>
  );
}

function SortableCard({
  project,
  selected,
  checked,
  selectMode,
  onOpen,
  onToggle,
}: {
  project: Project;
  selected: boolean;
  checked: boolean;
  selectMode: boolean;
  onOpen: (project: Project) => void;
  onToggle: (project: Project) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
    data: { type: "card", columnId: project.columnId },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-1">
      {selectMode ? (
        <input
          className="mt-3"
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(project)}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          aria-label={`Select ${project.name}`}
        />
      ) : null}
      <div
        className="min-w-0 flex-1 touch-none"
        {...attributes}
        {...listeners}
        onClick={() => {
          if (!isDragging) onOpen(project);
        }}
      >
        <CardFace project={project} active={selected} checked={checked} dragging={isDragging} />
      </div>
    </div>
  );
}

function ColumnLane({
  column,
  projects,
  selectedId,
  checkedIds,
  selectMode,
  onOpen,
  onToggle,
  onRename,
  onDelete,
}: {
  column: Column;
  projects: Project[];
  selectedId: string | null;
  checkedIds: Set<string>;
  selectMode: boolean;
  onOpen: (project: Project) => void;
  onToggle: (project: Project) => void;
  onRename: (column: Column, title: string) => void;
  onDelete: (column: Column) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", columnId: column.id },
  });
  const [title, setTitle] = useState(column.title);

  return (
    <section className="paper-strip flex w-[19rem] shrink-0 flex-col rounded-lg p-3">
      <header className="column-tape mb-3 flex items-center gap-2 rounded px-3 py-2">
        <input
          aria-label={`Column ${column.title}`}
          className="w-full bg-transparent font-[family-name:var(--font-serif)] text-lg font-semibold outline-none"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => title.trim() && title !== column.title && onRename(column, title.trim())}
        />
        <span className="rounded-full bg-[var(--ink)] px-2 py-0.5 text-[11px] font-bold text-[var(--paper)]">
          {projects.length}
        </span>
        <button className="text-sm text-[var(--clay)]" onClick={() => onDelete(column)} type="button" aria-label="Delete column">
          ×
        </button>
      </header>
      <div
        ref={setNodeRef}
        className={`drop-well flex min-h-48 flex-1 flex-col gap-2 overflow-y-auto rounded-md p-2 ${isOver ? "drop-well-hot" : ""}`}
      >
        <SortableContext items={projects.map((project) => project.id)} strategy={verticalListSortingStrategy}>
          {projects.map((project) => (
            <SortableCard
              key={project.id}
              project={project}
              selected={selectedId === project.id}
              checked={checkedIds.has(project.id)}
              selectMode={selectMode}
              onOpen={onOpen}
              onToggle={onToggle}
            />
          ))}
        </SortableContext>
        {projects.length === 0 ? (
          <p className="m-auto px-3 py-8 text-center text-sm text-[var(--ink-soft)]">Drop a project here</p>
        ) : null}
      </div>
    </section>
  );
}

export function StudioBoard() {
  const router = useRouter();
  const [columns, setColumns] = useState<Column[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [trashPath, setTrashPath] = useState("");
  const [cloneRoot, setCloneRoot] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [bulkTrashOpen, setBulkTrashOpen] = useState(false);
  const [bulkTrashing, setBulkTrashing] = useState(false);
  const [presence, setPresence] = useState<"all" | "disk" | "git">("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const dragging = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }

  function applyBoard(data: BoardResponse) {
    setColumns([...data.columns].sort((a, b) => a.order - b.order));
    setProjects(data.projects);
    if (data.settings) {
      setSettings(data.settings);
      if (data.settings.trashPath) setTrashPath(data.settings.trashPath);
      if (data.settings.cloneRoot) setCloneRoot(data.settings.cloneRoot);
      if (!data.settings.setupComplete) setSetupOpen(true);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api<BoardResponse>("/api/board");
        if (cancelled) return;
        applyBoard(data);
        if (data.projects.length === 0) {
          const scanned = await api<BoardResponse>("/api/scan", { method: "POST" });
          if (!cancelled) applyBoard(scanned);
        }
      } catch (error) {
        if (!cancelled) flash(error instanceof Error ? error.message : "Could not load the board");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return projects.filter((project) => {
      if (Boolean(project.trashed) !== showTrash) return false;
      if (!showHidden && project.hidden) return false;
      if (presence === "disk" && !hasLocalCopy(project)) return false;
      if (presence === "git" && !isGitOnly(project)) return false;
      if (!needle) return true;
      return `${project.name} ${project.path} ${project.notes} ${project.remoteUrl || ""}`.toLowerCase().includes(needle);
    });
  }, [projects, query, showHidden, showTrash, presence]);

  const activeProject = projects.find((project) => project.id === activeId) || null;
  const checkedProjects = projects.filter((project) => checkedIds.has(project.id) && hasLocalCopy(project));
  const gitOnlyCount = projects.filter((project) => isGitOnly(project)).length;

  function toggleCheck(project: Project) {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(project.id)) next.delete(project.id);
      else next.add(project.id);
      return next;
    });
  }

  async function bulkTrash(payload: { confirmName: string; confirmCount: number; confirmPhrase: string }) {
    setBulkTrashing(true);
    try {
      const result = await api<{ moved: Project[]; errors: string[] }>("/api/projects/trash", {
        method: "POST",
        body: JSON.stringify({
          ids: checkedProjects.map((project) => project.id),
          confirmCount: payload.confirmCount,
          confirmPhrase: payload.confirmPhrase,
        }),
      });
      setBulkTrashOpen(false);
      setCheckedIds(new Set());
      setSelectMode(false);
      for (const project of result.moved) replaceProject(project);
      setShowTrash(true);
      flash(
        result.errors?.length
          ? `Moved ${result.moved.length}. Failures: ${result.errors.join(" · ")}`
          : `Moved ${result.moved.length} to trash`,
      );
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not move to trash");
    } finally {
      setBulkTrashing(false);
    }
  }

  async function scan() {
    setBusy(true);
    try {
      const data = await api<BoardResponse & { added: number; missing: number }>("/api/scan", { method: "POST" });
      applyBoard(data);
      flash(`Scan: +${data.added} new, ${data.missing} missing`);
    } catch (error) {
      flash(error instanceof Error ? error.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  }

  async function addColumn() {
    const title = window.prompt("Column name");
    if (!title?.trim()) return;
    const data = await api<{ columns: Column[] }>("/api/columns", {
      method: "POST",
      body: JSON.stringify({ title: title.trim() }),
    });
    setColumns([...data.columns].sort((a, b) => a.order - b.order));
  }

  async function renameColumn(column: Column, title: string) {
    const data = await api<{ columns: Column[] }>("/api/columns", {
      method: "PATCH",
      body: JSON.stringify({ id: column.id, title }),
    });
    setColumns([...data.columns].sort((a, b) => a.order - b.order));
  }

  async function deleteColumn(column: Column) {
    if (!window.confirm(`Delete the “${column.title}” column? Projects move to another column.`)) return;
    const data = await api<{ columns: Column[]; projects: Project[] }>("/api/columns", {
      method: "DELETE",
      body: JSON.stringify({ id: column.id }),
    });
    setColumns([...data.columns].sort((a, b) => a.order - b.order));
    setProjects(data.projects);
  }

  function addCreated(project: Project, message: string) {
    setProjects((current) => {
      if (current.some((item) => item.id === project.id)) {
        return current.map((item) => (item.id === project.id ? project : item));
      }
      return [...current, project];
    });
    setManualOpen(false);
    flash(message);
    router.push(`/projects/${encodeURIComponent(project.id)}`);
  }

  async function importGithub() {
    setBusy(true);
    try {
      const data = await api<BoardResponse & { added: number; total: number }>("/api/github/import", { method: "POST" });
      applyBoard(data);
      setPresence("git");
      flash(`GitHub: ${data.added} new on the board from ${data.total} repos`);
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not read GitHub");
    } finally {
      setBusy(false);
    }
  }

  async function syncBackend() {
    setBusy(true);
    try {
      const data = await api<
        BoardResponse & { pulled: boolean; pushed: boolean; created: boolean; count: number; repo: string }
      >("/api/sync", { method: "POST", body: JSON.stringify({ action: "sync" }) });
      applyBoard(data);
      const count = data.count ?? data.projects.length;
      flash(
        data.created
          ? `Created ${data.repo} · ${count} projects`
          : `Synced with ${data.repo} · ${count} projects`,
      );
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not sync");
    } finally {
      setBusy(false);
    }
  }

  function replaceProject(next: Project) {
    setProjects((current) => current.map((project) => (project.id === next.id ? next : project)));
  }

  function openProject(project: Project) {
    if (dragging.current) return;
    router.push(`/projects/${encodeURIComponent(project.id)}`);
  }

  function onDragStart(event: DragStartEvent) {
    dragging.current = true;
    setActiveId(String(event.active.id));
  }

  async function moveProject(projectId: string, columnId: string, order = Date.now()) {
    const moving = projects.find((project) => project.id === projectId);
    if (!moving || (moving.columnId === columnId && order === moving.order)) return;
    setProjects((current) =>
      current.map((project) => (project.id === projectId ? { ...project, columnId, order } : project)),
    );
    try {
      const data = await api<{ project: Project }>("/api/projects", {
        method: "PATCH",
        body: JSON.stringify({ id: projectId, columnId, order }),
      });
      replaceProject(data.project);
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not move");
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    window.setTimeout(() => {
      dragging.current = false;
    }, 40);
    if (!over) return;

    const moving = projects.find((project) => project.id === String(active.id));
    if (!moving) return;

    const overId = String(over.id);
    const overColumn = columns.find((column) => column.id === overId);
    const overProject = projects.find((project) => project.id === overId);
    const columnId = overColumn?.id || overProject?.columnId;
    if (!columnId) return;

    const order = overProject && overProject.id !== moving.id ? overProject.order - 1 : Date.now();
    if (columnId === moving.columnId && !overProject) return;
    await moveProject(moving.id, columnId, order);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="studio-header z-20 flex shrink-0 flex-wrap items-center gap-2 px-4 py-3">
        <div className="mr-2">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[var(--ink-soft)]">Studio</p>
          <h1 className="font-[family-name:var(--font-serif)] text-2xl leading-none">ProjectHub</h1>
        </div>
        <input
          className="min-w-40 flex-1 rounded-full border border-[var(--rule)] bg-[var(--card)] px-4 py-2"
          placeholder="Search name, path, or GitHub…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="flex rounded-full border border-[var(--rule)] p-0.5 text-sm">
          {(["all", "disk", "git"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={`rounded-full px-3 py-1 ${presence === value ? "bg-[var(--ink)] text-[var(--paper)]" : ""}`}
              onClick={() => setPresence(value)}
            >
              {value === "all" ? "All" : value === "disk" ? "On disk" : `Git only (${gitOnlyCount})`}
            </button>
          ))}
        </div>
        <button className="rounded-full bg-[var(--ink)] px-4 py-2 text-[var(--paper)]" onClick={() => setManualOpen(true)}>
          Add
        </button>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className={`rounded-full border px-3 py-2 ${menuOpen || showTrash || selectMode ? "border-[var(--ink)] bg-[var(--card)]" : "border-[var(--rule)]"}`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((current) => !current)}
          >
            More
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-30 mt-2 w-56 rounded-lg border border-[var(--rule)] bg-[var(--card)] p-1 shadow-lg"
            >
              <button
                role="menuitem"
                className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--paper-deep)] disabled:opacity-40"
                disabled={busy}
                onClick={() => {
                  setMenuOpen(false);
                  void scan();
                }}
              >
                {busy ? "Scanning…" : "Scan folders"}
              </button>
              <button
                role="menuitem"
                className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--paper-deep)] disabled:opacity-40"
                disabled={busy}
                onClick={() => {
                  setMenuOpen(false);
                  void syncBackend();
                }}
              >
                Sync backend
              </button>
              <button
                role="menuitem"
                className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--paper-deep)] disabled:opacity-40"
                disabled={busy}
                onClick={() => {
                  setMenuOpen(false);
                  void importGithub();
                }}
              >
                Import GitHub
              </button>
              <button
                role="menuitem"
                className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--paper-deep)]"
                onClick={() => {
                  setMenuOpen(false);
                  void addColumn();
                }}
              >
                Add column
              </button>
              <button
                role="menuitem"
                className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--paper-deep)] disabled:opacity-40"
                disabled={showTrash}
                onClick={() => {
                  setMenuOpen(false);
                  setSelectMode((current) => {
                    if (current) setCheckedIds(new Set());
                    return !current;
                  });
                }}
              >
                {selectMode ? "Exit bulk delete" : "Bulk delete"}
              </button>
              <button
                role="menuitem"
                className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--paper-deep)]"
                onClick={() => {
                  setMenuOpen(false);
                  setShowTrash((current) => !current);
                  setSelectMode(false);
                  setCheckedIds(new Set());
                }}
              >
                {showTrash ? "Back to wall" : `Trash (${projects.filter((project) => project.trashed).length})`}
              </button>
              <label className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-[var(--paper-deep)]">
                <input type="checkbox" checked={showHidden} onChange={(event) => setShowHidden(event.target.checked)} />
                Show hidden
              </label>
              <div className="my-1 border-t border-[var(--rule)]" />
              <Link role="menuitem" className="block rounded-md px-3 py-2 text-sm hover:bg-[var(--paper-deep)]" href="/catalog" onClick={() => setMenuOpen(false)}>
                Catalog
              </Link>
              <Link role="menuitem" className="block rounded-md px-3 py-2 text-sm hover:bg-[var(--paper-deep)]" href="/settings" onClick={() => setMenuOpen(false)}>
                Settings
              </Link>
              <Link role="menuitem" className="block rounded-md px-3 py-2 text-sm hover:bg-[var(--paper-deep)]" href="/setup" onClick={() => setMenuOpen(false)}>
                Setup
              </Link>
            </div>
          ) : null}
        </div>
      </header>

      {selectMode && !showTrash ? (
        <div className="mx-4 mt-2 flex flex-wrap items-center gap-3 rounded-md bg-[var(--ink)] px-4 py-2 text-sm text-[var(--paper)]">
          <span>
            {checkedProjects.length === 0
              ? "Check the projects to move"
              : `${checkedProjects.length} selected`}
          </span>
          <button
            type="button"
            className="rounded-full bg-[var(--clay)] px-3 py-1 text-white disabled:opacity-40"
            disabled={checkedProjects.length === 0}
            onClick={() => setBulkTrashOpen(true)}
          >
            Move to trash…
          </button>
          <button
            type="button"
            className="underline"
            onClick={() => {
              setSelectMode(false);
              setCheckedIds(new Set());
            }}
          >
            Cancel
          </button>
        </div>
      ) : null}

      {toast ? (
        <div className="mx-4 mt-2 rounded-md bg-[var(--ink)] px-4 py-2 text-sm text-[var(--paper)]">{toast}</div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-x-auto px-4 py-4">
          {showTrash ? (
            <div className="mx-auto flex max-w-xl flex-col gap-2">
              <button className="mb-1 text-left text-sm text-[var(--amber)]" type="button" onClick={() => setShowTrash(false)}>
                ← Studio wall
              </button>
              <p className="mb-2 text-sm text-[var(--ink-soft)]">
                Folders moved to <span className="font-mono text-xs">{trashPath || "(not set)"}</span>
              </p>
              {visible.length === 0 ? (
                <p className="paper-strip rounded-lg p-6 text-sm text-[var(--ink-soft)]">Trash is empty.</p>
              ) : (
                visible.map((project) => (
                  <button key={project.id} className="text-left" type="button" onClick={() => openProject(project)}>
                    <CardFace project={project} />
                  </button>
                ))
              )}
            </div>
          ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={onDragStart}
            onDragCancel={() => {
              setActiveId(null);
              dragging.current = false;
            }}
            onDragEnd={onDragEnd}
          >
            <div className="flex h-full items-stretch gap-3">
              {columns.map((column) => (
                <ColumnLane
                  key={`${column.id}:${column.title}`}
                  column={column}
                  selectedId={null}
                  checkedIds={checkedIds}
                  selectMode={selectMode}
                  projects={visible
                    .filter((project) => project.columnId === column.id)
                    .sort((a, b) => a.order - b.order)}
                  onOpen={openProject}
                  onToggle={toggleCheck}
                  onRename={renameColumn}
                  onDelete={deleteColumn}
                />
              ))}
            </div>
            <DragOverlay dropAnimation={null}>
              {activeProject ? <div className="w-72 rotate-1"><CardFace project={activeProject} /></div> : null}
            </DragOverlay>
          </DndContext>
          )}
        </main>
      </div>

      {bulkTrashOpen ? (
        <TrashConfirm
          projects={checkedProjects}
          trashPath={trashPath}
          busy={bulkTrashing}
          onCancel={() => setBulkTrashOpen(false)}
          onConfirm={(payload) => void bulkTrash(payload)}
        />
      ) : null}

      {manualOpen ? (
        <CreateProjectDialog
          key={cloneRoot}
          cloneRoot={cloneRoot}
          onClose={() => setManualOpen(false)}
          onCreated={addCreated}
          onToast={flash}
        />
      ) : null}

      {setupOpen && settings ? (
        <SetupWizard
          settings={settings}
          onDone={(next) => {
            setSettings(next);
            setTrashPath(next.trashPath);
            setCloneRoot(next.cloneRoot);
            setSetupOpen(false);
            flash("Setup saved");
          }}
          onSkip={() => setSetupOpen(false)}
        />
      ) : null}
    </div>
  );
}
