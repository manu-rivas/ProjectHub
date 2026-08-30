"use client";

import { api } from "@/lib/client";
import type { CatalogEntry, Project } from "@/lib/types";
import { useState } from "react";

type Props = {
  name: string;
  catalogId?: string;
  projectId?: string;
  url: string;
  defaultParent: string;
  onClose: () => void;
  onCloned: (project: Project, entry: CatalogEntry) => void;
  onToast: (message: string) => void;
};

export function CloneDialog({ name, catalogId, projectId, url, defaultParent, onClose, onCloned, onToast }: Props) {
  const [parent, setParent] = useState(defaultParent);
  const [busy, setBusy] = useState(false);

  async function pick() {
    try {
      const result = await api<{ path: string }>("/api/picker/folder", { method: "POST" });
      setParent(result.path);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "No folder was chosen");
    }
  }

  async function clone() {
    setBusy(true);
    try {
      const result = await api<{ project: Project; entry: CatalogEntry }>("/api/projects/clone", {
        method: "POST",
        body: JSON.stringify({ catalogId, projectId, url, parent }),
      });
      onCloned(result.project, result.entry);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Could not clone");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sheet-scrim fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="w-[min(32rem,92vw)] rounded-lg bg-[var(--paper)] p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Download</p>
        <h2 className="mt-1 font-[family-name:var(--font-serif)] text-2xl">{name}</h2>
        <p className="mt-2 break-all font-mono text-xs text-[var(--ink-soft)]">{url}</p>
        <p className="mt-3 text-sm text-[var(--ink-soft)]">
          A folder named <span className="font-mono text-xs">{name}</span> will be created inside the destination you choose.
        </p>
        <label className="mt-4 block text-sm">
          Destination folder
          <input
            className="mt-1 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2 font-mono text-sm"
            value={parent}
            onChange={(event) => setParent(event.target.value)}
          />
        </label>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button className="rounded-md border border-[var(--rule)] px-3 py-2" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="rounded-md border border-[var(--ink)] px-3 py-2" type="button" onClick={pick}>
            Choose folder…
          </button>
          <button className="rounded-md bg-[var(--ink)] px-4 py-2 text-[var(--paper)] disabled:opacity-40" type="button" onClick={clone} disabled={busy || !parent.trim()}>
            {busy ? "Cloning…" : "Clone"}
          </button>
        </div>
      </div>
    </div>
  );
}
