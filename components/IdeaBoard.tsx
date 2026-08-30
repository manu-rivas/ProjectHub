"use client";

import { api } from "@/lib/client";
import type { CardColor, Column, IdeaCard, IdeasBoard, Project } from "@/lib/types";
import { CARD_COLORS } from "@/lib/types";
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
import { useState } from "react";

function ideaId(prefix = "idea"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyCard(columnId: string, title: string): IdeaCard {
  return {
    id: ideaId(),
    columnId,
    title,
    order: Date.now(),
    body: "",
    color: null,
    labels: [],
  };
}

function BoardCard({
  card,
  onChange,
  onRemove,
}: {
  card: IdeaCard;
  onChange: (card: IdeaCard) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [body, setBody] = useState(card.body || "");
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: card.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const tint = card.color ? `index-card-tint-${card.color}` : "";

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
            className="w-[min(28rem,92vw)] rounded-lg bg-[var(--paper)] p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              commit({});
              setOpen(false);
            }}
          >
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Card</p>
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
  onRename,
  onDelete,
  onChangeCard,
  onRemoveCard,
  onAddCard,
}: {
  column: Column;
  cards: IdeaCard[];
  onRename: (title: string) => void;
  onDelete: () => void;
  onChangeCard: (card: IdeaCard) => void;
  onRemoveCard: (id: string) => void;
  onAddCard: (title: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [title, setTitle] = useState(column.title);
  const [draft, setDraft] = useState("");

  return (
    <section className={`flex w-[15.5rem] shrink-0 flex-col rounded-md p-2 ${isOver ? "drop-well-hot" : "drop-well"}`}>
      <header className="mb-2 flex items-center gap-1">
        <input
          className="w-full bg-transparent text-xs font-bold uppercase tracking-wider outline-none"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => title.trim() && title !== column.title && onRename(title.trim())}
        />
        <span className="text-xs text-[var(--ink-soft)]">{cards.length}</span>
        <button className="text-[var(--clay)]" type="button" aria-label={`Delete ${column.title}`} onClick={onDelete}>
          ×
        </button>
      </header>
      <div ref={setNodeRef} className="flex min-h-24 flex-1 flex-col gap-2">
        <SortableContext items={cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <BoardCard key={card.id} card={card} onChange={onChangeCard} onRemove={() => onRemoveCard(card.id)} />
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
          placeholder="Add a card…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </form>
    </section>
  );
}

export function IdeaBoard({ project, onChange, onToast }: { project: Project; onChange: (project: Project) => void; onToast: (message: string) => void }) {
  const [columnTitle, setColumnTitle] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const ideas: IdeasBoard = {
    columns: project.ideas?.columns?.length
      ? project.ideas.columns
      : [
          { id: "idea-inbox", title: "Backlog", order: 0 },
          { id: "idea-doing", title: "Doing", order: 1 },
          { id: "idea-done", title: "Done", order: 2 },
        ],
    cards: (project.ideas?.cards ?? []).map((card) => ({
      ...card,
      body: card.body ?? "",
      color: card.color ?? null,
      labels: card.labels ?? [],
    })),
  };

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

  return (
    <div className="flex h-full min-h-80 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--ink-soft)]">This project’s board. Columns and cards stay with the card, not the studio wall.</p>
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
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
        <div className="flex min-h-0 flex-1 gap-2 overflow-x-auto pb-2">
          {[...ideas.columns]
            .sort((a, b) => a.order - b.order)
            .map((column) => (
              <BoardColumn
                key={column.id}
                column={column}
                cards={ideas.cards.filter((card) => card.columnId === column.id).sort((a, b) => a.order - b.order)}
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
                    columns: ideas.columns.filter((item) => item.id !== column.id),
                    cards: ideas.cards.map((card) => (card.columnId === column.id && fallback ? { ...card, columnId: fallback } : card)),
                  });
                }}
                onChangeCard={(card) =>
                  void persist({
                    ...ideas,
                    cards: ideas.cards.map((item) => (item.id === card.id ? card : item)),
                  })
                }
                onRemoveCard={(id) => void persist({ ...ideas, cards: ideas.cards.filter((card) => card.id !== id) })}
                onAddCard={(title) => void persist({ ...ideas, cards: [emptyCard(column.id, title), ...ideas.cards] })}
              />
            ))}
        </div>
      </DndContext>
    </div>
  );
}
