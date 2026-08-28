"use client";

import { useState } from "react";
import type { Project } from "@/lib/types";

type Props = {
  project: Project;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (confirmName: string) => void;
};

export function LocalDeleteConfirm({ project, busy, onCancel, onConfirm }: Props) {
  const [name, setName] = useState("");

  return (
    <div className="sheet-scrim fixed inset-0 z-50 flex items-center justify-center" onClick={onCancel}>
      <div className="w-[min(32rem,92vw)] rounded-lg bg-[var(--paper)] p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Borrar en local</p>
        <h2 className="mt-1 font-[family-name:var(--font-serif)] text-2xl">Quitar la carpeta del disco</h2>
        <p className="mt-3 text-sm leading-relaxed">
          Esto borra <span className="font-mono text-xs">{project.path}</span>. El proyecto <strong>sigue en el tablero</strong> con su
          columna, notas e ideas. El remoto de Git no se toca. <strong>No va a la papelera</strong>.
        </p>
        <label className="mt-4 block text-sm">
          Escribe el nombre para confirmar: <span className="font-mono">{project.name}</span>
          <input
            className="mt-1 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2 font-mono"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded-md border border-[var(--rule)] px-3 py-2" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button
            className="rounded-md bg-[var(--ink)] px-4 py-2 text-[var(--paper)] disabled:opacity-40"
            type="button"
            disabled={busy || name.trim() !== project.name}
            onClick={() => onConfirm(name)}
          >
            {busy ? "Borrando…" : "Borrar carpeta local"}
          </button>
        </div>
      </div>
    </div>
  );
}
