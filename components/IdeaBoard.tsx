"use client";

import { api } from "@/lib/client";
import type { IdeaCard, IdeasBoard, Project } from "@/lib/types";
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

function ideaId(): string {
  return `idea-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function IdeaNote({
  card,
  onChange,
  onRemove,
}: {
  card: IdeaCard;
  onChange: (card: IdeaCard) => void;
  onRemove: () => void;
}) {
  const [text, setText] = useState(card.title);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: card.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="index-card rounded-md p-2">
      <div className="flex items-start gap-1">
        <button className="cursor-grab pt-1 text-[var(--ink-soft)]" type="button" aria-label="Arrastrar idea" {...attributes} {...listeners}>
          ⋮⋮
        </button>
        <textarea
          className="min-h-[3.2rem] w-full resize-y bg-transparent text-sm outline-none"
          value={text}
          placeholder="Una idea…"
          onChange={(event) => setText(event.target.value)}
          onBlur={() => {
            if (text.trim() !== card.title) onChange({ ...card, title: text.trim() || card.title });
          }}
        />
        <button className="text-xs text-[var(--clay)]" type="button" onClick={onRemove} aria-label="Borrar idea">
          ×
        </button>
      </div>
    </div>
  );
}

function IdeaColumn({
  columnId,
  title,
  cards,
  onChange,
  onRemove,
}: {
  columnId: string;
  title: string;
  cards: IdeaCard[];
  onChange: (card: IdeaCard) => void;
  onRemove: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  return (
    <section className={`flex min-w-[10.5rem] flex-1 flex-col rounded-md p-2 ${isOver ? "drop-well-hot" : "drop-well"}`}>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">
        {title} <span className="font-normal">{cards.length}</span>
      </h3>
      <div ref={setNodeRef} className="flex min-h-24 flex-1 flex-col gap-2">
        <SortableContext items={cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <IdeaNote key={card.id} card={card} onChange={onChange} onRemove={() => onRemove(card.id)} />
          ))}
        </SortableContext>
      </div>
    </section>
  );
}

export function IdeaBoard({ project, onChange, onToast }: { project: Project; onChange: (project: Project) => void; onToast: (message: string) => void }) {
  const [draft, setDraft] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const ideas = {
    columns: project.ideas?.columns?.length
      ? project.ideas.columns
      : [
          { id: "idea-inbox", title: "Ideas", order: 0 },
          { id: "idea-doing", title: "Cocinando", order: 1 },
          { id: "idea-done", title: "Hecho", order: 2 },
        ],
    cards: project.ideas?.cards ?? [],
  };

  async function persist(next: IdeasBoard) {
    try {
      const result = await api<{ project: Project }>("/api/projects", {
        method: "PATCH",
        body: JSON.stringify({ id: project.id, ideas: next }),
      });
      onChange(result.project);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "No se pudieron guardar las ideas");
    }
  }

  function addIdea() {
    const title = draft.trim();
    if (!title) return;
    const inbox = ideas.columns[0]?.id || "idea-inbox";
    const card: IdeaCard = { id: ideaId(), columnId: inbox, title, order: Date.now() };
    setDraft("");
    void persist({ ...ideas, cards: [card, ...ideas.cards] });
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
    <div className="flex h-full min-h-72 flex-col gap-3">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          addIdea();
        }}
      >
        <input
          className="flex-1 rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2 text-sm"
          placeholder="Nueva idea y Enter…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button className="rounded-md bg-[var(--ink)] px-3 py-2 text-sm text-[var(--paper)]" type="submit">
          Añadir
        </button>
      </form>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
        <div className="flex min-h-0 flex-1 gap-2 overflow-x-auto">
          {[...ideas.columns]
            .sort((a, b) => a.order - b.order)
            .map((column) => (
              <IdeaColumn
                key={column.id}
                columnId={column.id}
                title={column.title}
                cards={ideas.cards.filter((card) => card.columnId === column.id).sort((a, b) => a.order - b.order)}
                onChange={(card) =>
                  void persist({
                    ...ideas,
                    cards: ideas.cards.map((item) => (item.id === card.id ? card : item)),
                  })
                }
                onRemove={(id) => void persist({ ...ideas, cards: ideas.cards.filter((card) => card.id !== id) })}
              />
            ))}
        </div>
      </DndContext>
    </div>
  );
}
