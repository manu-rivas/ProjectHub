"use client";

import { api } from "@/lib/client";
import type { PublicSettings, StorageBackend } from "@/lib/types";
import { STORAGE_BACKENDS } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

type DatabaseStatus = {
  exists: boolean;
  path: string;
  columns: number;
  projects: number;
  catalog: number;
};

type Dep = {
  id: string;
  label: string;
  optional: boolean;
  ok: boolean;
  version: string;
  hint: string;
};

export default function SettingsPage() {
  const [roots, setRoots] = useState("");
  const [depth, setDepth] = useState(2);
  const [ignore, setIgnore] = useState("");
  const [trashPath, setTrashPath] = useState("");
  const [cloneRoot, setCloneRoot] = useState("");
  const [storage, setStorage] = useState<StorageBackend>("json");
  const [usePortless, setUsePortless] = useState(false);
  const [database, setDatabase] = useState<DatabaseStatus | null>(null);
  const [deps, setDeps] = useState<Dep[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((response) => response.json())
      .then((data: { settings: PublicSettings; database?: DatabaseStatus; deps?: Dep[] }) => {
        setRoots(data.settings.scanRoots.join("\n"));
        setDepth(data.settings.depth);
        setIgnore(data.settings.ignore.join("\n"));
        setTrashPath(data.settings.trashPath || "");
        setCloneRoot(data.settings.cloneRoot || "");
        setStorage(data.settings.storage || "json");
        setUsePortless(Boolean(data.settings.usePortless));
        setDatabase(data.database || null);
        setDeps(data.deps || []);
      })
      .catch(() => setMessage("Could not load settings"));
  }, []);

  const portless = deps.find((item) => item.id === "portless");

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      const data = await api<{ settings: PublicSettings; database?: DatabaseStatus; deps?: Dep[] }>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({
          scanRoots: roots.split("\n").map((line) => line.trim()).filter(Boolean),
          depth,
          ignore: ignore.split("\n").map((line) => line.trim()).filter(Boolean),
          trashPath,
          cloneRoot,
          usePortless: Boolean(portless?.ok) && usePortless,
        }),
      });
      setStorage(data.settings.storage);
      setUsePortless(data.settings.usePortless);
      setDatabase(data.database || null);
      setDeps(data.deps || []);
      setMessage("Settings saved. Go back to the board and scan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save");
    }
  }

  async function chooseBackend(next: StorageBackend) {
    setBusy(true);
    try {
      const data = await api<{ settings: PublicSettings; database?: DatabaseStatus }>("/api/setup", {
        method: "POST",
        body: JSON.stringify({
          action:
            next === "sqlite"
              ? "init-db"
              : next === "github"
                ? "init-backend"
                : next === "supabase"
                  ? "init-supabase"
                  : "set-backend",
          storage: next,
        }),
      });
      setStorage(data.settings.storage);
      setDatabase(data.database || null);
      setMessage(`Backend is now ${next}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not switch backend");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-6 py-10">
      <Link className="text-sm underline decoration-[var(--amber)] underline-offset-4" href="/">
        ← Board
      </Link>
      {" · "}
      <Link className="text-sm underline decoration-[var(--amber)] underline-offset-4" href="/catalog">
        Catalog
      </Link>
      {" · "}
      <Link className="text-sm underline decoration-[var(--amber)] underline-offset-4" href="/setup">
        Setup
      </Link>
      <h1 className="mt-4 font-[family-name:var(--font-serif)] text-4xl">Settings</h1>
      <p className="mt-2 text-[var(--ink-soft)]">
        Local folders on this machine. Secrets for Supabase stay in{" "}
        <code className="font-mono text-sm">~/.projecthub/secrets.json</code>, not in the GitHub backup.
      </p>
      <form className="paper-strip mt-8 space-y-5 rounded-lg p-5" onSubmit={save}>
        <label className="block">
          <span className="text-sm font-bold uppercase tracking-wider">Scan roots</span>
          <textarea
            className="mt-2 h-40 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] p-3 font-mono text-sm"
            value={roots}
            onChange={(event) => setRoots(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold uppercase tracking-wider">Depth (1–3)</span>
          <input
            className="mt-2 w-24 rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2"
            type="number"
            min={1}
            max={3}
            value={depth}
            onChange={(event) => setDepth(Number(event.target.value))}
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold uppercase tracking-wider">Ignore names</span>
          <textarea
            className="mt-2 h-32 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] p-3 font-mono text-sm"
            value={ignore}
            onChange={(event) => setIgnore(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold uppercase tracking-wider">Trash (path on disk)</span>
          <input
            className="mt-2 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] p-3 font-mono text-sm"
            value={trashPath}
            onChange={(event) => setTrashPath(event.target.value)}
            placeholder="~/…/trash"
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold uppercase tracking-wider">Default clone / create destination</span>
          <input
            className="mt-2 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] p-3 font-mono text-sm"
            value={cloneRoot}
            onChange={(event) => setCloneRoot(event.target.value)}
            placeholder="~/Developer"
          />
        </label>
        <label className={`flex items-start gap-2 text-sm ${portless?.ok ? "" : "opacity-50"}`}>
          <input
            className="mt-1"
            type="checkbox"
            disabled={!portless?.ok}
            checked={Boolean(portless?.ok) && usePortless}
            onChange={(event) => setUsePortless(event.target.checked)}
          />
          <span>
            Start with Portless
            <span className="mt-1 block text-xs text-[var(--ink-soft)]">
              {portless?.ok
                ? "Next `pnpm dev` can open https://projecthub.localhost"
                : "Portless is not installed, so ProjectHub stays on 127.0.0.1:3456"}
            </span>
          </span>
        </label>
        <button className="rounded-md bg-[var(--ink)] px-4 py-2 text-[var(--paper)]" type="submit">
          Save
        </button>
      </form>

      <section className="paper-strip mt-6 space-y-3 rounded-lg p-5">
        <h2 className="font-[family-name:var(--font-serif)] text-2xl">Backend</h2>
        <p className="text-sm text-[var(--ink-soft)]">
          Active: <strong>{storage}</strong>
          {database?.exists ? ` · SQLite ${database.projects} projects` : ""}
        </p>
        <div className="grid gap-2">
          {STORAGE_BACKENDS.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={busy}
              className={`rounded-md border px-3 py-2 text-left text-sm disabled:opacity-40 ${
                storage === item.id ? "border-[var(--ink)] bg-[var(--card)]" : "border-[var(--rule)]"
              }`}
              onClick={() => void chooseBackend(item.id)}
            >
              <strong>{item.name}</strong>
              <span className="mt-0.5 block text-[var(--ink-soft)]">{item.description}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--ink-soft)]">
          Switching to GitHub or Supabase from here uses credentials already saved. Use Setup to paste a new Supabase
          key.
        </p>
        {message ? <p className="text-sm">{message}</p> : null}
      </section>

      <section className="paper-strip mt-6 space-y-2 rounded-lg p-5">
        <h2 className="font-[family-name:var(--font-serif)] text-2xl">This machine</h2>
        <p className="text-sm text-[var(--ink-soft)]">
          GitHub CLI is required to clone and import projects. Portless and Cursor stay optional.
        </p>
        <ul className="space-y-1 text-sm">
          {deps.map((item) => (
            <li key={item.id}>
              <strong>{item.label}</strong>{" "}
              <span className={item.ok ? "text-[var(--moss)]" : item.optional ? "text-[var(--ink-soft)]" : "text-[var(--clay)]"}>
                {item.ok ? `ready ${item.version}`.trim() : item.optional ? "optional, missing" : "missing"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
