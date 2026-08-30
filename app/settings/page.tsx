"use client";

import { api } from "@/lib/client";
import type { PublicSettings, StorageBackend } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

type DatabaseStatus = {
  exists: boolean;
  path: string;
  columns: number;
  projects: number;
  catalog: number;
};

export default function SettingsPage() {
  const [roots, setRoots] = useState("");
  const [depth, setDepth] = useState(2);
  const [ignore, setIgnore] = useState("");
  const [trashPath, setTrashPath] = useState("");
  const [cloneRoot, setCloneRoot] = useState("");
  const [storage, setStorage] = useState<StorageBackend>("json");
  const [database, setDatabase] = useState<DatabaseStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((response) => response.json())
      .then((data: { settings: PublicSettings; database?: DatabaseStatus }) => {
        setRoots(data.settings.scanRoots.join("\n"));
        setDepth(data.settings.depth);
        setIgnore(data.settings.ignore.join("\n"));
        setTrashPath(data.settings.trashPath || "");
        setCloneRoot(data.settings.cloneRoot || "");
        setStorage(data.settings.storage || "json");
        setDatabase(data.database || null);
      })
      .catch(() => setMessage("Could not load settings"));
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      const data = await api<{ settings: PublicSettings; database?: DatabaseStatus }>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({
          scanRoots: roots.split("\n").map((line) => line.trim()).filter(Boolean),
          depth,
          ignore: ignore.split("\n").map((line) => line.trim()).filter(Boolean),
          trashPath,
          cloneRoot,
        }),
      });
      setStorage(data.settings.storage);
      setDatabase(data.database || null);
      setMessage("Settings saved. Go back to the board and scan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save");
    }
  }

  async function initDatabase() {
    setBusy(true);
    try {
      const data = await api<{ settings: PublicSettings; database: DatabaseStatus }>("/api/setup", {
        method: "POST",
        body: JSON.stringify({ action: "init-db" }),
      });
      setStorage(data.settings.storage);
      setDatabase(data.database);
      setMessage("SQLite initialized. Your JSON store is still written as a backup.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not initialize the database");
    } finally {
      setBusy(false);
    }
  }

  async function initBackend() {
    setBusy(true);
    try {
      const data = await api<{ repo: string; created: boolean; count: number }>("/api/setup", {
        method: "POST",
        body: JSON.stringify({ action: "init-backend" }),
      });
      setMessage(
        data.created
          ? `Created ${data.repo} · ${data.count} projects`
          : `Synced ${data.repo} · ${data.count} projects`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not initialize the GitHub backend");
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
      <h1 className="mt-4 font-[family-name:var(--font-serif)] text-4xl">Settings</h1>
      <p className="mt-2 text-[var(--ink-soft)]">
        Local folders on this machine. The optional GitHub backend is{" "}
        <code className="font-mono text-sm">your-user/projecthub-data</code> via{" "}
        <code className="font-mono text-sm">gh auth login</code>. The local store stays at{" "}
        <code className="font-mono text-sm">~/.projecthub/store.json</code> even after you initialize SQLite.
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
          <span className="mt-1 block text-xs text-[var(--ink-soft)]">
            Sending a project here moves the folder and appends a hash to the name. Created if missing.
          </span>
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
        <button className="rounded-md bg-[var(--ink)] px-4 py-2 text-[var(--paper)]" type="submit">
          Save
        </button>
      </form>

      <section className="paper-strip mt-6 space-y-3 rounded-lg p-5">
        <h2 className="font-[family-name:var(--font-serif)] text-2xl">Database</h2>
        <p className="text-sm text-[var(--ink-soft)]">
          Active backend: <strong>{storage === "sqlite" ? "SQLite" : "JSON file"}</strong>
          {database?.exists
            ? ` · ${database.path} · ${database.projects} projects`
            : " · SQLite not initialized yet"}
        </p>
        <button
          className="rounded-md border border-[var(--ink)] px-4 py-2 disabled:opacity-40"
          type="button"
          disabled={busy}
          onClick={() => void initDatabase()}
        >
          {database?.exists ? "Re-import JSON into SQLite" : "Initialize SQLite from this board"}
        </button>
        <button
          className="ml-2 rounded-md border border-[var(--moss)] px-4 py-2 disabled:opacity-40"
          type="button"
          disabled={busy}
          onClick={() => void initBackend()}
        >
          Initialize GitHub backend
        </button>
        {message ? <p className="text-sm">{message}</p> : null}
      </section>
    </div>
  );
}
