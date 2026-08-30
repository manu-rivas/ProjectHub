"use client";

import { api } from "@/lib/client";
import type { PublicSettings, StorageBackend } from "@/lib/types";
import { STORAGE_BACKENDS } from "@/lib/types";
import { useEffect, useState } from "react";

type Dep = {
  id: string;
  label: string;
  optional: boolean;
  ok: boolean;
  version: string;
  hint: string;
};

type Props = {
  settings: PublicSettings;
  onDone: (settings: PublicSettings) => void;
  onSkip?: () => void;
};

export function SetupWizard({ settings, onDone, onSkip }: Props) {
  const [step, setStep] = useState(1);
  const [deps, setDeps] = useState<Dep[]>([]);
  const [roots, setRoots] = useState(settings.scanRoots.join("\n"));
  const [cloneRoot, setCloneRoot] = useState(settings.cloneRoot);
  const [trashPath, setTrashPath] = useState(settings.trashPath);
  const [storage, setStorage] = useState<StorageBackend>(settings.storage || "sqlite");
  const [usePortless, setUsePortless] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [sql, setSql] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api<{ deps: Dep[]; supabaseSql?: string }>("/api/setup");
        if (cancelled) return;
        setDeps(data.deps || []);
        if (data.supabaseSql) setSql(data.supabaseSql);
        const portless = data.deps?.find((item) => item.id === "portless");
        setUsePortless(Boolean(portless?.ok && settings.usePortless));
      } catch {
        if (!cancelled) setError("Could not read this machine");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [settings.usePortless]);

  const requiredMissing = deps.filter((item) => !item.optional && !item.ok);
  const portless = deps.find((item) => item.id === "portless");
  const gh = deps.find((item) => item.id === "gh");
  const canUseGithub = Boolean(gh?.ok);
  const canUsePortless = Boolean(portless?.ok);

  const folderPayload = {
    scanRoots: roots.split("\n").map((line) => line.trim()).filter(Boolean),
    cloneRoot,
    trashPath,
    usePortless: canUsePortless && usePortless,
  };

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      if (storage === "github" && !canUseGithub) {
        throw new Error("GitHub CLI is not ready. Choose another backend or run `gh auth login`.");
      }
      if (storage === "supabase" && (!supabaseUrl.trim() || !supabaseKey.trim())) {
        throw new Error("Paste a Supabase URL and service role key, or pick a local backend.");
      }
      const action =
        storage === "sqlite"
          ? "init-db"
          : storage === "github"
            ? "init-backend"
            : storage === "supabase"
              ? "init-supabase"
              : "complete";
      const data = await api<{ settings: PublicSettings }>("/api/setup", {
        method: "POST",
        body: JSON.stringify({
          ...folderPayload,
          action,
          storage,
          supabaseUrl,
          supabaseKey,
        }),
      });
      onDone(data.settings);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Setup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#c9b496]">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col px-6 py-10">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-[var(--ink-soft)]">Studio launch</p>
        <h1 className="mt-2 font-[family-name:var(--font-serif)] text-5xl leading-none">ProjectHub</h1>
        <p className="mt-3 max-w-xl text-[var(--ink-soft)]">
          A local board for the projects you start, park, and forget. GitHub CLI is required so you can clone and
          import repos — not only if you pick GitHub as the backend.
        </p>

        <ol className="mt-6 flex gap-2 text-xs font-bold uppercase tracking-wider">
          {["Machine", "Folders", "Backend"].map((label, index) => (
            <li
              key={label}
              className={`rounded-full px-3 py-1 ${step === index + 1 ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper-deep)] text-[var(--ink-soft)]"}`}
            >
              {index + 1}. {label}
            </li>
          ))}
        </ol>

        {step === 1 ? (
          <section className="paper-strip mt-6 rounded-xl p-6">
            <h2 className="font-[family-name:var(--font-serif)] text-2xl">This machine</h2>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              Node, Git, pnpm, and GitHub CLI must be green. Portless and Cursor stay optional.
            </p>
            <ul className="mt-4 space-y-2">
              {deps.map((item) => (
                <li key={item.id} className="rounded-lg border border-[var(--rule)] bg-[var(--card)] px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">
                      {item.label}
                      {item.optional ? <span className="ml-2 text-xs font-normal text-[var(--ink-soft)]">optional</span> : null}
                    </span>
                    <span className={`text-xs font-bold uppercase tracking-wider ${item.ok ? "text-[var(--moss)]" : item.optional ? "text-[var(--ink-soft)]" : "text-[var(--clay)]"}`}>
                      {item.ok ? `Ready ${item.version}`.trim() : item.optional ? "Not installed" : "Missing"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">{item.hint}</p>
                </li>
              ))}
            </ul>
            <label className={`mt-4 flex items-start gap-2 text-sm ${canUsePortless ? "" : "opacity-50"}`}>
              <input
                className="mt-1"
                type="checkbox"
                disabled={!canUsePortless}
                checked={canUsePortless && usePortless}
                onChange={(event) => setUsePortless(event.target.checked)}
              />
              <span>
                <strong>Start with Portless</strong> when it is installed.
                <span className="mt-1 block text-[var(--ink-soft)]">
                  {canUsePortless
                    ? "Next launch can use https://projecthub.localhost. You can change this in Settings."
                    : "Portless is not here, so ProjectHub will keep using http://127.0.0.1:3456."}
                </span>
              </span>
            </label>
            {requiredMissing.length ? (
              <p className="mt-4 text-sm text-[var(--clay)]">
                Install {requiredMissing.map((item) => item.label).join(", ")} before continuing.
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              {onSkip ? (
                <button type="button" className="text-[var(--ink-soft)]" onClick={onSkip}>
                  Skip for now
                </button>
              ) : null}
              <button
                className="rounded-md bg-[var(--ink)] px-4 py-2 text-[var(--paper)] disabled:opacity-40"
                type="button"
                disabled={requiredMissing.length > 0}
                onClick={() => setStep(2)}
              >
                Continue
              </button>
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="paper-strip mt-6 space-y-4 rounded-xl p-6">
            <h2 className="font-[family-name:var(--font-serif)] text-2xl">Where projects live</h2>
            <label className="block text-sm">
              Folders to scan
              <textarea
                className="mt-1 h-28 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] p-3 font-mono text-sm"
                value={roots}
                onChange={(event) => setRoots(event.target.value)}
              />
            </label>
            <label className="block text-sm">
              Default clone / create destination
              <input
                className="mt-1 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2 font-mono"
                value={cloneRoot}
                onChange={(event) => setCloneRoot(event.target.value)}
              />
            </label>
            <label className="block text-sm">
              Trash folder
              <input
                className="mt-1 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2 font-mono"
                value={trashPath}
                onChange={(event) => setTrashPath(event.target.value)}
              />
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setStep(1)}>
                Back
              </button>
              <button className="rounded-md bg-[var(--ink)] px-4 py-2 text-[var(--paper)]" type="button" onClick={() => setStep(3)}>
                Continue
              </button>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="paper-strip mt-6 space-y-4 rounded-xl p-6">
            <h2 className="font-[family-name:var(--font-serif)] text-2xl">Backend</h2>
            <p className="text-sm text-[var(--ink-soft)]">
              Local JSON is always written as a backup. Pick one place that should be the live backend.
            </p>
            <div className="grid gap-2">
              {STORAGE_BACKENDS.map((item) => {
                const blocked = item.id === "github" && !canUseGithub;
                return (
                  <label
                    key={item.id}
                    className={`rounded-lg border px-4 py-3 ${
                      storage === item.id ? "border-[var(--ink)] bg-[var(--card)]" : "border-[var(--rule)]"
                    } ${blocked ? "opacity-50" : ""}`}
                  >
                    <input
                      className="mr-2"
                      type="radio"
                      name="storage"
                      disabled={blocked}
                      checked={storage === item.id}
                      onChange={() => setStorage(item.id)}
                    />
                    <strong>{item.name}</strong>
                    <span className="mt-1 block pl-6 text-sm text-[var(--ink-soft)]">
                      {blocked ? "Needs `gh auth login` first." : item.description}
                    </span>
                  </label>
                );
              })}
            </div>
            {storage === "supabase" ? (
              <div className="space-y-2 rounded-md bg-[var(--paper-deep)] p-3">
                <label className="block text-sm">
                  Project URL
                  <input
                    className="mt-1 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2 font-mono text-sm"
                    value={supabaseUrl}
                    onChange={(event) => setSupabaseUrl(event.target.value)}
                    placeholder="https://xxxx.supabase.co"
                  />
                </label>
                <label className="block text-sm">
                  Service role key
                  <input
                    className="mt-1 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2 font-mono text-sm"
                    type="password"
                    value={supabaseKey}
                    onChange={(event) => setSupabaseKey(event.target.value)}
                    placeholder="Stored only in ~/.projecthub/secrets.json"
                  />
                </label>
                {sql ? (
                  <pre className="overflow-x-auto rounded-md bg-[var(--ink)] p-3 text-xs text-[var(--paper)]">{sql}</pre>
                ) : null}
                <p className="text-xs text-[var(--ink-soft)]">
                  Run that SQL once in the Supabase editor if the table does not exist yet. Keys never go into the
                  public GitHub backup.
                </p>
              </div>
            ) : null}
            {error ? <p className="text-sm text-[var(--clay)]">{error}</p> : null}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setStep(2)} disabled={busy}>
                Back
              </button>
              <button
                className="rounded-md bg-[var(--ink)] px-4 py-2 text-[var(--paper)] disabled:opacity-40"
                type="button"
                disabled={busy}
                onClick={() => void finish()}
              >
                {busy ? "Opening the studio…" : "Open the studio"}
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
