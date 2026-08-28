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
import { useEffect, useMemo, useRef, useState } from "react";
import { ProjectPane } from "./ProjectPane";
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
        {gitOnly ? project.remoteUrl || "Solo en Git" : project.path || project.remoteUrl || "Sin carpeta local"}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {project.trashed ? <span className="chip chip-gone">Papelera</span> : null}
        {gitOnly ? (
          <span className="chip chip-gone">No en local</span>
        ) : isLive(project) ? (
          <span className="chip chip-live">Publicado</span>
        ) : (
          <span className="chip chip-draft">Local</span>
        )}
        {project.remoteUrl && !gitOnly ? <span className="chip chip-live">Git</span> : null}
        {project.docs.length > 0 ? <span className="chip chip-draft">{project.docs.length} docs</span> : null}
        {(project.ideas?.cards.length || 0) > 0 ? (
          <span className="chip chip-draft">{project.ideas.cards.length} ideas</span>
        ) : null}
        {project.missing && !project.remoteUrl ? <span className="chip chip-gone">Perdido</span> : null}
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
          aria-label={`Seleccionar ${project.name}`}
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

  useEffect(() => {
    setTitle(column.title);
  }, [column.title]);

  return (
    <section className="paper-strip flex w-[19rem] shrink-0 flex-col rounded-lg p-3">
      <header className="column-tape mb-3 flex items-center gap-2 rounded px-3 py-2">
        <input
          aria-label={`Columna ${column.title}`}
          className="w-full bg-transparent font-[family-name:var(--font-serif)] text-lg font-semibold outline-none"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => title.trim() && title !== column.title && onRename(column, title.trim())}
        />
        <span className="rounded-full bg-[var(--ink)] px-2 py-0.5 text-[11px] font-bold text-[var(--paper)]">
          {projects.length}
        </span>
        <button className="text-sm text-[var(--clay)]" onClick={() => onDelete(column)} type="button" aria-label="Eliminar columna">
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
          <p className="m-auto px-3 py-8 text-center text-sm text-[var(--ink-soft)]">Suelta aquí un proyecto</p>
        ) : null}
      </div>
    </section>
  );
}

export function StudioBoard() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [trashPath, setTrashPath] = useState("");
  const [cloneRoot, setCloneRoot] = useState("");
  const [selected, setSelected] = useState<Project | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualPath, setManualPath] = useState("");
  const [manualName, setManualName] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [bulkTrashOpen, setBulkTrashOpen] = useState(false);
  const [bulkTrashing, setBulkTrashing] = useState(false);
  const [presence, setPresence] = useState<"all" | "disk" | "git">("all");
  const [manualUrl, setManualUrl] = useState("");
  const dragging = useRef(false);

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
    if (data.settings?.trashPath) setTrashPath(data.settings.trashPath);
    if (data.settings?.cloneRoot) setCloneRoot(data.settings.cloneRoot);
    setSelected((current) => {
      if (!current) return current;
      return data.projects.find((project) => project.id === current.id) || current;
    });
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
        if (!cancelled) flash(error instanceof Error ? error.message : "No se pudo cargar el tablero");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
          ? `Movidos ${result.moved.length}. Fallos: ${result.errors.join(" · ")}`
          : `Movidos ${result.moved.length} a la papelera`,
      );
    } catch (error) {
      flash(error instanceof Error ? error.message : "No se pudo mover a la papelera");
    } finally {
      setBulkTrashing(false);
    }
  }

  async function scan() {
    setBusy(true);
    try {
      const data = await api<BoardResponse & { added: number; missing: number }>("/api/scan", { method: "POST" });
      applyBoard(data);
      flash(`Escaneo: +${data.added} nuevos, ${data.missing} perdidos`);
    } catch (error) {
      flash(error instanceof Error ? error.message : "El escaneo falló");
    } finally {
      setBusy(false);
    }
  }

  async function addColumn() {
    const title = window.prompt("Nombre de la columna");
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
    if (!window.confirm(`¿Eliminar la columna “${column.title}”? Los proyectos se mueven a otra.`)) return;
    const data = await api<{ columns: Column[]; projects: Project[] }>("/api/columns", {
      method: "DELETE",
      body: JSON.stringify({ id: column.id }),
    });
    setColumns([...data.columns].sort((a, b) => a.order - b.order));
    setProjects(data.projects);
  }

  async function addManual() {
    try {
      if (manualUrl.trim()) {
        const data = await api<{ project: Project }>("/api/catalog", {
          method: "POST",
          body: JSON.stringify({ url: manualUrl, name: manualName }),
        });
        setProjects((current) => {
          if (current.some((project) => project.id === data.project.id)) {
            return current.map((project) => (project.id === data.project.id ? data.project : project));
          }
          return [...current, data.project];
        });
        setSelected(data.project);
        flash("Añadido al tablero desde Git. Aún no hay carpeta local.");
      } else {
        const data = await api<{ project: Project }>("/api/projects", {
          method: "POST",
          body: JSON.stringify({ path: manualPath, name: manualName }),
        });
        setProjects((current) => [...current, data.project]);
      }
      setManualOpen(false);
      setManualPath("");
      setManualName("");
      setManualUrl("");
    } catch (error) {
      flash(error instanceof Error ? error.message : "No se pudo añadir");
    }
  }

  async function importGithub() {
    setBusy(true);
    try {
      const data = await api<BoardResponse & { added: number; total: number }>("/api/github/import", { method: "POST" });
      applyBoard(data);
      setPresence("git");
      flash(`GitHub: ${data.added} nuevos en el tablero de ${data.total} repos`);
    } catch (error) {
      flash(error instanceof Error ? error.message : "No se pudo leer GitHub");
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
          ? `Repo ${data.repo} creado · ${count} proyectos`
          : `Sincronizado con ${data.repo} · ${count} proyectos`,
      );
    } catch (error) {
      flash(error instanceof Error ? error.message : "No se pudo sincronizar");
    } finally {
      setBusy(false);
    }
  }

  function replaceProject(next: Project) {
    setProjects((current) => current.map((project) => (project.id === next.id ? next : project)));
    setSelected((current) => (current?.id === next.id ? next : current));
  }

  function openProject(project: Project) {
    if (dragging.current) return;
    setSelected(project);
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
      flash(error instanceof Error ? error.message : "No se pudo mover");
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
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[var(--ink-soft)]">Estudio</p>
          <h1 className="font-[family-name:var(--font-serif)] text-2xl leading-none">ProjectHub</h1>
        </div>
        <input
          className="min-w-40 flex-1 rounded-full border border-[var(--rule)] bg-[var(--card)] px-4 py-2"
          placeholder="Buscar nombre, ruta o GitHub…"
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
              {value === "all" ? "Todos" : value === "disk" ? "En disco" : `Solo Git (${gitOnlyCount})`}
            </button>
          ))}
        </div>
        <label className="text-sm text-[var(--ink-soft)]">
          <input className="mr-1" type="checkbox" checked={showHidden} onChange={(event) => setShowHidden(event.target.checked)} />
          Ocultos
        </label>
        <button className="rounded-full bg-[var(--ink)] px-4 py-2 text-[var(--paper)]" onClick={scan} disabled={busy}>
          {busy ? "Escaneando…" : "Escanear"}
        </button>
        <button className="rounded-full border border-[var(--ink)] px-3 py-2" onClick={() => setManualOpen(true)}>
          Añadir
        </button>
        <button className="rounded-full border border-[var(--ink)] px-3 py-2" onClick={() => void syncBackend()} disabled={busy}>
          {busy ? "…" : "Sincronizar"}
        </button>
        <button className="rounded-full border border-[var(--moss)] px-3 py-2" onClick={() => void importGithub()} disabled={busy}>
          Traer GitHub
        </button>
        <button className="rounded-full border border-[var(--rule)] px-3 py-2" onClick={addColumn}>
          + Columna
        </button>
        <button
          className={`rounded-full border px-3 py-2 ${selectMode ? "border-[var(--clay)] bg-[var(--clay)] text-white" : "border-[var(--rule)]"}`}
          onClick={() => {
            setSelectMode((current) => {
              if (current) setCheckedIds(new Set());
              return !current;
            });
          }}
          disabled={showTrash}
        >
          {selectMode ? "Salir de borrar varios" : "Borrar varios"}
        </button>
        <button
          className={`rounded-full border px-3 py-2 ${showTrash ? "border-[var(--clay)] bg-[var(--clay)] text-white" : "border-[var(--rule)]"}`}
          onClick={() => {
            setShowTrash((current) => !current);
            setSelected(null);
            setSelectMode(false);
            setCheckedIds(new Set());
          }}
        >
          Papelera ({projects.filter((project) => project.trashed).length})
        </button>
        <Link className="px-1 text-sm underline decoration-[var(--amber)] underline-offset-4" href="/catalogo">
          Catálogo
        </Link>
        <Link className="px-1 text-sm underline decoration-[var(--amber)] underline-offset-4" href="/settings">
          Ajustes
        </Link>
      </header>

      {selectMode && !showTrash ? (
        <div className="mx-4 mt-2 flex flex-wrap items-center gap-3 rounded-md bg-[var(--ink)] px-4 py-2 text-sm text-[var(--paper)]">
          <span>
            {checkedProjects.length === 0
              ? "Marca los proyectos a mover"
              : `${checkedProjects.length} seleccionados`}
          </span>
          <button
            type="button"
            className="rounded-full bg-[var(--clay)] px-3 py-1 text-white disabled:opacity-40"
            disabled={checkedProjects.length === 0}
            onClick={() => setBulkTrashOpen(true)}
          >
            Mover a papelera…
          </button>
          <button
            type="button"
            className="underline"
            onClick={() => {
              setSelectMode(false);
              setCheckedIds(new Set());
            }}
          >
            Cancelar
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
              <p className="mb-2 text-sm text-[var(--ink-soft)]">
                Carpetas movidas a <span className="font-mono text-xs">{trashPath || "(sin configurar)"}</span>
              </p>
              {visible.length === 0 ? (
                <p className="paper-strip rounded-lg p-6 text-sm text-[var(--ink-soft)]">La papelera está vacía.</p>
              ) : (
                visible.map((project) => (
                  <button key={project.id} className="text-left" type="button" onClick={() => openProject(project)}>
                    <CardFace project={project} active={selected?.id === project.id} />
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
                  key={column.id}
                  column={column}
                  selectedId={selected?.id ?? null}
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

        <ProjectPane
          project={selected}
          columns={columns}
          trashPath={trashPath}
          cloneRoot={cloneRoot}
          onChange={replaceProject}
          onMove={(projectId, columnId) => void moveProject(projectId, columnId)}
          onToast={flash}
          onTrashed={(moved, errors) => {
            for (const project of moved) replaceProject(project);
            setCheckedIds((current) => {
              const next = new Set(current);
              for (const project of moved) next.delete(project.id);
              return next;
            });
            setShowTrash(true);
            setSelected(moved[0] || null);
            flash(
              errors.length
                ? `Movidos ${moved.length}. Fallos: ${errors.join(" · ")}`
                : `Movido a la papelera: ${moved[0]?.path || ""}`,
            );
          }}
        />
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
        <div className="sheet-scrim fixed inset-0 z-40 flex items-center justify-center" onClick={() => setManualOpen(false)}>
          <form
            className="w-[min(32rem,92vw)] rounded-lg bg-[var(--paper)] p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              void addManual();
            }}
          >
            <h2 className="font-[family-name:var(--font-serif)] text-2xl">Añadir</h2>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">Una carpeta de este Mac, o una URL de Git si aún no está en local.</p>
            <label className="mt-4 block text-sm">
              Ruta local
              <input
                className="mt-1 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2"
                value={manualPath}
                onChange={(event) => setManualPath(event.target.value)}
                placeholder="/Users/…/mi-proyecto"
              />
            </label>
            <label className="mt-3 block text-sm">
              URL de Git
              <input
                className="mt-1 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2 font-mono text-sm"
                value={manualUrl}
                onChange={(event) => setManualUrl(event.target.value)}
                placeholder="https://github.com/usuario/repo"
              />
            </label>
            <label className="mt-3 block text-sm">
              Nombre (opcional)
              <input
                className="mt-1 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2"
                value={manualName}
                onChange={(event) => setManualName(event.target.value)}
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setManualOpen(false)}>
                Cancelar
              </button>
              <button className="rounded-md bg-[var(--ink)] px-4 py-2 text-[var(--paper)]" type="submit" disabled={!manualPath.trim() && !manualUrl.trim()}>
                Añadir
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
