"use client";

import { api } from "@/lib/client";
import type { CardColor, Column, IdeaCard, IdeasBoard, IssueKind, Project, Sprint } from "@/lib/types";
import { CARD_COLORS, ISSUE_KINDS } from "@/lib/types";
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useMemo, useState } from "react";

function ideaId(prefix = "idea"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyCard(columnId: string, title: string, sprintId: string | null): IdeaCard {
  return {
    id: ideaId(),
    columnId,
    title,
    order: Date.now(),
    body: "",
    color: null,
    labels: [],
    kind: "task",
    sprintId,
    points: null,
  };
}

function activeSprint(sprints: Sprint[]): Sprint | undefined {
  return sprints.find((sprint) => sprint.state === "active");
}

function BoardCard({
  card,
  sprints,
  onChange,
  onRemove,
}: {
  card: IdeaCard;
  sprints: Sprint[];
  onChange: (card: IdeaCard) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [body, setBody] = useState(card.body || "");
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: card.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const tint = card.color ? `index-card-tint-${card.color}` : "";
  const kind = ISSUE_KINDS.find((item) => item.id === card.kind) || ISSUE_KINDS[1];

  function commit(next: Partial<IdeaCard>) {
    onChange({ ...card, title: title.trim() || card.title, body, ...next });
  }

  return (
    <div ref={setNodeRef} style={style}>
      <article className={`index-card rounded-md p-2 ${tint}`}>
        <div className="flex items-start gap-1">
          <button className="cursor-grab pt-1 text-[var(--ink-soft)]" type="button" aria-label="Drag card" {...attributes} {...listeners}>
            ⋮⋮
          </button>
          <button className="min-w-0 flex-1 text-left" type="button" onClick={() => setOpen(true)}>
            <p className="text-sm font-semibold leading-snug">{card.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <span className="chip chip-draft" style={{ background: `${kind.swatch}22`, color: kind.swatch }}>
                {kind.label}
              </span>
              {card.points != null ? <span className="chip chip-draft">{card.points} pts</span> : null}
            </div>
            {card.body ? <p className="mt-1 line-clamp-2 text-xs text-[var(--ink-soft)]">{card.body}</p> : null}
            {card.labels.length ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {card.labels.map((label) => (
                  <span key={label} className="chip chip-draft">
                    {label}
                  </span>
                ))}
              </div>
            ) : null}
          </button>
        </div>
      </article>
      {open ? (
        <div className="sheet-scrim fixed inset-0 z-50 flex items-center justify-center" onClick={() => setOpen(false)}>
          <form
            className="max-h-[90vh] w-[min(28rem,92vw)] overflow-y-auto rounded-lg bg-[var(--paper)] p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              commit({});
              setOpen(false);
            }}
          >
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Task</p>
            <input
              className="mt-2 w-full bg-transparent font-[family-name:var(--font-serif)] text-2xl outline-none"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <textarea
              className="notes mt-3 min-h-32 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] p-2 text-sm"
              placeholder="Description, acceptance, links…"
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                Type
                <select
                  className="mt-1 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-2 py-1 font-sans text-sm font-normal normal-case tracking-normal"
                  value={card.kind || "task"}
                  onChange={(event) => commit({ kind: event.target.value as IssueKind })}
                >
                  {ISSUE_KINDS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
                Points
                <input
                  className="mt-1 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-2 py-1 font-sans text-sm font-normal normal-case tracking-normal"
                  type="number"
                  min={0}
                  max={99}
                  value={card.points ?? ""}
                  placeholder="—"
                  onChange={(event) => {
                    const raw = event.target.value;
                    commit({ points: raw === "" ? null : Number(raw) });
                  }}
                />
              </label>
            </div>
            <label className="mt-3 block text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
              Sprint
              <select
                className="mt-1 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-2 py-1 font-sans text-sm font-normal normal-case tracking-normal"
                value={card.sprintId || ""}
                onChange={(event) => commit({ sprintId: event.target.value || null })}
              >
                <option value="">Backlog</option>
                {sprints.map((sprint) => (
                  <option key={sprint.id} value={sprint.id}>
                    {sprint.name}
                    {sprint.state === "active" ? " (active)" : sprint.state === "done" ? " (done)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Card color">
              <button
                type="button"
                className={`h-6 w-6 rounded-full border-2 ${!card.color ? "border-[var(--ink)]" : "border-[var(--rule)]"}`}
                style={{ background: "var(--card)" }}
                aria-label="No color"
                onClick={() => commit({ color: null })}
              />
              {CARD_COLORS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`h-6 w-6 rounded-full border-2 ${card.color === item.id ? "border-[var(--ink)]" : "border-white/70"}`}
                  style={{ background: item.swatch }}
                  aria-label={item.label}
                  onClick={() => commit({ color: item.id as CardColor })}
                />
              ))}
            </div>
            <label className="mt-3 block text-sm">
              Labels
              <input
                className="mt-1 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-2 py-1 text-sm"
                defaultValue={card.labels.join(", ")}
                placeholder="bug, slice, later"
                onBlur={(event) =>
                  commit({
                    labels: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
            <div className="mt-4 flex justify-between">
              <button className="text-sm text-[var(--clay)]" type="button" onClick={onRemove}>
                Delete card
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setOpen(false)}>
                  Close
                </button>
                <button className="rounded-md bg-[var(--ink)] px-3 py-1 text-[var(--paper)]" type="submit">
                  Save
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function BoardColumn({
  column,
  cards,
  sprints,
  onRename,
  onDelete,
  onChangeCard,
  onRemoveCard,
  onAddCard,
}: {
  column: Column;
  cards: IdeaCard[];
  sprints: Sprint[];
  onRename: (title: string) => void;
  onDelete: () => void;
  onChangeCard: (card: IdeaCard) => void;
  onRemoveCard: (id: string) => void;
  onAddCard: (title: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [title, setTitle] = useState(column.title);
  const [draft, setDraft] = useState("");

  function saveTitle() {
    if (title.trim() && title.trim() !== column.title) onRename(title.trim());
  }

  return (
    <section className={`flex w-[16.5rem] shrink-0 flex-col rounded-md p-2 ${isOver ? "drop-well-hot" : "drop-well"}`}>
      <header className="mb-2 flex items-center gap-1">
        <input
          className="w-full rounded-sm border border-transparent bg-transparent px-1 text-xs font-bold uppercase tracking-wider outline-none hover:border-[var(--rule)] focus:border-[var(--ink)]"
          value={title}
          title="Rename column"
          aria-label={`Rename column ${column.title}`}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={saveTitle}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              (event.target as HTMLInputElement).blur();
            }
          }}
        />
        <span className="text-xs text-[var(--ink-soft)]">{cards.length}</span>
        <button className="text-[var(--clay)]" type="button" aria-label={`Delete ${column.title}`} onClick={onDelete}>
          ×
        </button>
      </header>
      <div ref={setNodeRef} className="flex min-h-24 flex-1 flex-col gap-2">
        <SortableContext items={cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <BoardCard key={card.id} card={card} sprints={sprints} onChange={onChangeCard} onRemove={() => onRemoveCard(card.id)} />
          ))}
        </SortableContext>
      </div>
      <form
        className="mt-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.trim()) return;
          onAddCard(draft.trim());
          setDraft("");
        }}
      >
        <input
          className="w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-2 py-1 text-sm"
          placeholder="Add a task…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </form>
    </section>
  );
}

export function IdeaBoard({
  project,
  onChange,
  onToast,
  fullScreen = false,
}: {
  project: Project;
  onChange: (project: Project) => void;
  onToast: (message: string) => void;
  fullScreen?: boolean;
}) {
  const [columnTitle, setColumnTitle] = useState("");
  const [view, setView] = useState<"board" | "backlog">("board");
  const [sprintName, setSprintName] = useState("");
  const [sprintGoal, setSprintGoal] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const ideas: IdeasBoard = useMemo(() => {
    const columns = project.ideas?.columns?.length
      ? project.ideas.columns
      : [
          { id: "idea-inbox", title: "To do", order: 0 },
          { id: "idea-doing", title: "In progress", order: 1 },
          { id: "idea-done", title: "Done", order: 2 },
        ];
    return {
      columns,
      cards: (project.ideas?.cards ?? []).map((card) => ({
        ...card,
        body: card.body ?? "",
        color: card.color ?? null,
        labels: card.labels ?? [],
        kind: card.kind || "task",
        sprintId: card.sprintId ?? null,
        points: card.points ?? null,
      })),
      sprints: project.ideas?.sprints ?? [],
    };
  }, [project.ideas]);

  const current = activeSprint(ideas.sprints);
  const boardHref = `/projects/${encodeURIComponent(project.id)}/board`;
  const projectHref = `/projects/${encodeURIComponent(project.id)}`;

  async function persist(next: IdeasBoard) {
    try {
      const result = await api<{ project: Project }>("/api/projects", {
        method: "PATCH",
        body: JSON.stringify({ id: project.id, ideas: next }),
      });
      onChange(result.project);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Could not save the board");
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const moving = ideas.cards.find((card) => card.id === String(active.id));
    if (!moving) return;
    const overId = String(over.id);
    const overColumn = ideas.columns.find((column) => column.id === overId);
    const overCard = ideas.cards.find((card) => card.id === overId);
    const columnId = overColumn?.id || overCard?.columnId;
    if (!columnId) return;
    const order = overCard && overCard.id !== moving.id ? overCard.order - 1 : Date.now();
    void persist({
      ...ideas,
      cards: ideas.cards.map((card) => (card.id === moving.id ? { ...card, columnId, order } : card)),
    });
  }

  function startSprint() {
    const name = sprintName.trim() || `Sprint ${ideas.sprints.length + 1}`;
    const started: Sprint = { id: ideaId("spr"), name, goal: sprintGoal.trim(), state: "active" };
    const sprints = ideas.sprints.map((sprint) => (sprint.state === "active" ? { ...sprint, state: "done" as const } : sprint));
    const first = ideas.sprints.length === 0;
    setSprintName("");
    setSprintGoal("");
    void persist({
      ...ideas,
      sprints: [...sprints, started],
      cards: first ? ideas.cards.map((card) => (card.sprintId ? card : { ...card, sprintId: started.id })) : ideas.cards,
    });
  }

  function completeSprint() {
    if (!current) return;
    const doneColumn = [...ideas.columns].sort((a, b) => a.order - b.order).at(-1);
    void persist({
      ...ideas,
      sprints: ideas.sprints.map((sprint) => (sprint.id === current.id ? { ...sprint, state: "done" as const } : sprint)),
      cards: ideas.cards.map((card) => {
        if (card.sprintId !== current.id) return card;
        if (doneColumn && card.columnId === doneColumn.id) return card;
        return { ...card, sprintId: null };
      }),
    });
  }

  const backlogCards = ideas.cards.filter((card) => {
    if (!card.sprintId) return true;
    const sprint = ideas.sprints.find((item) => item.id === card.sprintId);
    return !sprint || sprint.state !== "active";
  });

  const shell = fullScreen ? "flex h-full min-h-0 flex-col gap-3" : "flex h-full min-h-80 flex-col gap-3";

  return (
    <div className={shell}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {fullScreen ? (
            <Link className="text-sm text-[var(--amber)]" href={projectHref}>
              ← Project page
            </Link>
          ) : (
            <Link className="text-sm text-[var(--amber)]" href={boardHref}>
              Full screen
            </Link>
          )}
          <button
            type="button"
            className={`rounded-full border px-3 py-1 text-sm ${view === "board" ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]" : "border-[var(--rule)]"}`}
            onClick={() => setView("board")}
          >
            Board
          </button>
          <button
            type="button"
            className={`rounded-full border px-3 py-1 text-sm ${view === "backlog" ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]" : "border-[var(--rule)]"}`}
            onClick={() => setView("backlog")}
          >
            Backlog
          </button>
          {current ? (
            <span className="text-sm text-[var(--ink-soft)]">
              Active: <strong className="text-[var(--ink)]">{current.name}</strong>
              {current.goal ? ` · ${current.goal}` : ""}
            </span>
          ) : (
            <span className="text-sm text-[var(--ink-soft)]">No active sprint. Tasks live in the backlog until you start one.</span>
          )}
        </div>
        <form
          className="flex gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            const title = columnTitle.trim();
            if (!title) return;
            setColumnTitle("");
            void persist({
              ...ideas,
              columns: [...ideas.columns, { id: ideaId("col"), title, order: ideas.columns.length }],
            });
          }}
        >
          <input
            className="w-36 rounded-md border border-[var(--rule)] bg-[var(--card)] px-2 py-1 text-sm"
            placeholder="New column"
            value={columnTitle}
            onChange={(event) => setColumnTitle(event.target.value)}
          />
          <button className="rounded-md border border-[var(--ink)] px-2 py-1 text-sm" type="submit">
            Add
          </button>
        </form>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2">
        <p className="mr-auto text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Sprint</p>
        {current ? (
          <button className="rounded-md bg-[var(--ink)] px-3 py-1.5 text-sm text-[var(--paper)]" type="button" onClick={completeSprint}>
            Complete sprint
          </button>
        ) : (
          <>
            <input
              className="w-40 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-2 py-1 text-sm"
              placeholder="Sprint name"
              value={sprintName}
              onChange={(event) => setSprintName(event.target.value)}
            />
            <input
              className="w-52 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-2 py-1 text-sm"
              placeholder="Goal (optional)"
              value={sprintGoal}
              onChange={(event) => setSprintGoal(event.target.value)}
            />
            <button className="rounded-md bg-[var(--ink)] px-3 py-1.5 text-sm text-[var(--paper)]" type="button" onClick={startSprint}>
              Start sprint
            </button>
          </>
        )}
      </div>

      {view === "backlog" ? (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-[var(--rule)] bg-[var(--card)] p-3">
          <p className="text-sm text-[var(--ink-soft)]">
            Backlog is everything not in the active sprint. Open a card to set type, points, and sprint.
          </p>
          {backlogCards.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--ink-soft)]">Backlog is empty. Add a task on the board.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {backlogCards
                .sort((a, b) => a.order - b.order)
                .map((card) => {
                  const kind = ISSUE_KINDS.find((item) => item.id === card.kind) || ISSUE_KINDS[1];
                  return (
                    <li key={card.id} className="flex items-center gap-2 rounded-md border border-[var(--rule)] px-3 py-2">
                      <span className="chip chip-draft" style={{ background: `${kind.swatch}22`, color: kind.swatch }}>
                        {kind.label}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-semibold">{card.title}</span>
                      {card.points != null ? <span className="text-xs text-[var(--ink-soft)]">{card.points} pts</span> : null}
                      {current ? (
                        <button
                          className="text-sm text-[var(--amber)]"
                          type="button"
                          onClick={() =>
                            void persist({
                              ...ideas,
                              cards: ideas.cards.map((item) => (item.id === card.id ? { ...item, sprintId: current.id } : item)),
                            })
                          }
                        >
                          Add to sprint
                        </button>
                      ) : null}
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
          <div className="flex min-h-0 flex-1 gap-2 overflow-x-auto pb-2">
            {[...ideas.columns]
              .sort((a, b) => a.order - b.order)
              .map((column) => {
                const cards = ideas.cards
                  .filter((card) => card.columnId === column.id)
                  .filter((card) => !current || card.sprintId === current.id)
                  .sort((a, b) => a.order - b.order);
                return (
                  <BoardColumn
                    key={column.id}
                    column={column}
                    cards={cards}
                    sprints={ideas.sprints}
                    onRename={(title) =>
                      void persist({
                        ...ideas,
                        columns: ideas.columns.map((item) => (item.id === column.id ? { ...item, title } : item)),
                      })
                    }
                    onDelete={() => {
                      if (ideas.columns.length <= 1) return;
                      const fallback = ideas.columns.find((item) => item.id !== column.id)?.id;
                      void persist({
                        ...ideas,
                        columns: ideas.columns.filter((item) => item.id !== column.id),
                        cards: ideas.cards.map((card) =>
                          card.columnId === column.id && fallback ? { ...card, columnId: fallback } : card,
                        ),
                      });
                    }}
                    onChangeCard={(card) =>
                      void persist({
                        ...ideas,
                        cards: ideas.cards.map((item) => (item.id === card.id ? card : item)),
                      })
                    }
                    onRemoveCard={(id) => void persist({ ...ideas, cards: ideas.cards.filter((card) => card.id !== id) })}
                    onAddCard={(title) =>
                      void persist({
                        ...ideas,
                        cards: [emptyCard(column.id, title, current?.id ?? null), ...ideas.cards],
                      })
                    }
                  />
                );
              })}
          </div>
        </DndContext>
      )}
    </div>
  );
}
