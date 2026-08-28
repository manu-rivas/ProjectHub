"use client";

import { TRASH_CONFIRM_PHRASE } from "@/lib/types";
import type { Project } from "@/lib/types";
import { useState } from "react";

type Props = {
  projects: Project[];
  trashPath: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (payload: { confirmName: string; confirmCount: number; confirmPhrase: string }) => void;
};

export function TrashConfirm({ projects, trashPath, busy, onCancel, onConfirm }: Props) {
  const [step, setStep] = useState(1);
  const [understood, setUnderstood] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [typedCount, setTypedCount] = useState("");
  const [phrase, setPhrase] = useState("");
  const bulk = projects.length > 1;
  const namesOk = bulk ? typedCount === String(projects.length) : typedName === projects[0]?.name;

  return (
    <div className="sheet-scrim fixed inset-0 z-50 flex items-center justify-center" onClick={onCancel}>
      <div
        className="max-h-[90vh] w-[min(34rem,92vw)] overflow-y-auto rounded-lg bg-[var(--paper)] p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[var(--clay)]">
          Papelera · paso {step} de 3
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-serif)] text-2xl">
          {bulk ? `Mover ${projects.length} proyectos` : "Mover a la papelera"}
        </h2>

        {step === 1 ? (
          <div className="mt-4 space-y-3 text-sm leading-relaxed">
            <p>
              Esto <strong>mueve las carpetas en el disco</strong>. Cada una se renombra con un hash en{" "}
              <span className="font-mono text-xs">{trashPath || "(sin configurar)"}</span>.
            </p>
            <ul className="max-h-48 overflow-y-auto rounded-md bg-[var(--card)] p-2 font-mono text-xs">
              {projects.map((project) => (
                <li key={project.id} className="truncate py-0.5">
                  {project.name}
                  <span className="text-[var(--ink-soft)]"> — {project.path}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onCancel}>
                Cancelar
              </button>
              <button className="rounded-md bg-[var(--ink)] px-4 py-2 text-[var(--paper)]" type="button" onClick={() => setStep(2)}>
                Entendido, seguir
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-4 space-y-3 text-sm">
            <label className="flex items-start gap-2">
              <input
                className="mt-1"
                type="checkbox"
                checked={understood}
                onChange={(event) => setUnderstood(event.target.checked)}
              />
              <span>Entiendo que las carpetas se mueven físicamente y desaparecen de su ruta actual.</span>
            </label>
            {bulk ? (
              <label className="block">
                Escribe cuántos proyectos vas a mover: <strong>{projects.length}</strong>
                <input
                  className="mt-1 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2 font-mono"
                  value={typedCount}
                  onChange={(event) => setTypedCount(event.target.value)}
                  inputMode="numeric"
                  autoComplete="off"
                />
              </label>
            ) : (
              <label className="block">
                Escribe el nombre del proyecto: <strong>{projects[0]?.name}</strong>
                <input
                  className="mt-1 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2 font-mono"
                  value={typedName}
                  onChange={(event) => setTypedName(event.target.value)}
                  autoComplete="off"
                />
              </label>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setStep(1)}>
                Atrás
              </button>
              <button
                className="rounded-md bg-[var(--ink)] px-4 py-2 text-[var(--paper)] disabled:opacity-40"
                type="button"
                disabled={!understood || !namesOk}
                onClick={() => setStep(3)}
              >
                Seguir
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-4 space-y-3 text-sm">
            <p>
              Última confirmación. Escribe <strong>{TRASH_CONFIRM_PHRASE}</strong> (tal cual, en mayúsculas).
            </p>
            <input
              className="w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2 font-mono"
              value={phrase}
              onChange={(event) => setPhrase(event.target.value)}
              autoComplete="off"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setStep(2)} disabled={busy}>
                Atrás
              </button>
              <button
                className="rounded-md bg-[var(--clay)] px-4 py-2 text-white disabled:opacity-40"
                type="button"
                disabled={busy || phrase !== TRASH_CONFIRM_PHRASE}
                onClick={() =>
                  onConfirm({
                    confirmName: bulk ? "" : typedName,
                    confirmCount: projects.length,
                    confirmPhrase: phrase,
                  })
                }
              >
                {busy ? "Moviendo…" : bulk ? `Mover ${projects.length} ahora` : "Mover ahora"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
