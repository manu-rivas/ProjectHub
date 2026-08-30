"use client";

import { api } from "@/lib/client";
import type { PublicSettings } from "@/lib/types";
import { useState } from "react";

type Props = {
  settings: PublicSettings;
  onDone: (settings: PublicSettings) => void;
  onSkip: () => void;
};

export function SetupWizard({ settings, onDone, onSkip }: Props) {
  const [step, setStep] = useState(1);
  const [roots, setRoots] = useState(settings.scanRoots.join("\n"));
  const [cloneRoot, setCloneRoot] = useState(settings.cloneRoot);
  const [trashPath, setTrashPath] = useState(settings.trashPath);
  const [initDb, setInitDb] = useState(true);
  const [initBackend, setInitBackend] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    setBusy(true);
    setError(null);
    const payload = {
      scanRoots: roots.split("\n").map((line) => line.trim()).filter(Boolean),
      cloneRoot,
      trashPath,
    };
    try {
      if (initDb) {
        await api("/api/setup", { method: "POST", body: JSON.stringify({ ...payload, action: "init-db" }) });
      }
      if (initBackend) {
        await api("/api/setup", { method: "POST", body: JSON.stringify({ ...payload, action: "init-backend" }) });
      }
      const data = await api<{ settings: PublicSettings }>("/api/setup", {
        method: "POST",
        body: JSON.stringify({ ...payload, action: "complete" }),
      });
      onDone(data.settings);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Setup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sheet-scrim fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="w-[min(36rem,94vw)] rounded-lg bg-[var(--paper)] p-6 shadow-xl">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
          First run · step {step} of 2
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-serif)] text-3xl">Welcome to ProjectHub</h2>

        {step === 1 ? (
          <div className="mt-4 space-y-4 text-sm">
            <p className="text-[var(--ink-soft)]">
              A local board for the projects you start, park, and forget. Nothing leaves this machine unless you turn on
              GitHub sync.
            </p>
            <label className="block">
              Folders to scan
              <textarea
                className="mt-1 h-28 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] p-3 font-mono text-sm"
                value={roots}
                onChange={(event) => setRoots(event.target.value)}
              />
            </label>
            <label className="block">
              Default clone / create destination
              <input
                className="mt-1 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2 font-mono"
                value={cloneRoot}
                onChange={(event) => setCloneRoot(event.target.value)}
              />
            </label>
            <label className="block">
              Trash folder
              <input
                className="mt-1 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2 font-mono"
                value={trashPath}
                onChange={(event) => setTrashPath(event.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="text-[var(--ink-soft)]" onClick={onSkip}>
                Skip for now
              </button>
              <button className="rounded-md bg-[var(--ink)] px-4 py-2 text-[var(--paper)]" type="button" onClick={() => setStep(2)}>
                Continue
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4 text-sm">
            <p className="text-[var(--ink-soft)]">
              Optional backends. JSON in <code className="font-mono text-xs">~/.projecthub</code> always stays as a
              backup, so this cannot break an existing board.
            </p>
            <label className="flex items-start gap-2 rounded-md border border-[var(--rule)] p-3">
              <input className="mt-1" type="checkbox" checked={initDb} onChange={(event) => setInitDb(event.target.checked)} />
              <span>
                <strong>Initialize SQLite</strong>
                <span className="mt-1 block text-[var(--ink-soft)]">
                  Creates <code className="font-mono text-xs">~/.projecthub/hub.db</code> and copies your current board
                  into it. You can do this later from Settings.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 rounded-md border border-[var(--rule)] p-3">
              <input
                className="mt-1"
                type="checkbox"
                checked={initBackend}
                onChange={(event) => setInitBackend(event.target.checked)}
              />
              <span>
                <strong>Initialize GitHub backend</strong>
                <span className="mt-1 block text-[var(--ink-soft)]">
                  Uses <code className="font-mono text-xs">gh</code> to create or update a private{" "}
                  <code className="font-mono text-xs">projecthub-data</code> repo. Requires{" "}
                  <code className="font-mono text-xs">gh auth login</code>.
                </span>
              </span>
            </label>
            {error ? <p className="text-[var(--clay)]">{error}</p> : null}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setStep(1)} disabled={busy}>
                Back
              </button>
              <button
                className="rounded-md bg-[var(--ink)] px-4 py-2 text-[var(--paper)] disabled:opacity-40"
                type="button"
                disabled={busy}
                onClick={() => void finish()}
              >
                {busy ? "Setting up…" : "Finish"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
