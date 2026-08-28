"use client";

import { api } from "@/lib/client";
import type { CatalogEntry } from "@/lib/types";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CloneDialog } from "@/components/CloneDialog";

type CatalogResponse = {
  catalog: CatalogEntry[];
  settings: { cloneRoot: string };
};

export default function CatalogPage() {
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [cloneRoot, setCloneRoot] = useState("");
  const [query, setQuery] = useState("");
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cloning, setCloning] = useState<CatalogEntry | null>(null);

  async function load() {
    const data = await api<CatalogResponse>("/api/catalog");
    setCatalog(data.catalog || []);
    setCloneRoot(data.settings?.cloneRoot || "");
  }

  useEffect(() => {
    load().catch(() => setMessage("No se pudo cargar el catálogo"));
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = [...catalog].sort((a, b) => a.name.localeCompare(b.name, "es"));
    if (!needle) return rows;
    return rows.filter((entry) => `${entry.name} ${entry.path} ${entry.remoteUrl || ""}`.toLowerCase().includes(needle));
  }, [catalog, query]);

  async function addUrl(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const data = await api<{ catalog: CatalogEntry[] }>("/api/catalog", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      setCatalog(data.catalog);
      setUrl("");
      setMessage("URL guardada en el catálogo");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  async function importGithub() {
    setBusy(true);
    try {
      const data = await api<{ catalog: CatalogEntry[]; added: number; total: number }>("/api/github/import", {
        method: "POST",
      });
      setCatalog(data.catalog);
      setMessage(`GitHub: ${data.added} nuevos de ${data.total} repos`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo leer GitHub");
    } finally {
      setBusy(false);
    }
  }

  const withRemote = catalog.filter((entry) => entry.remoteUrl).length;

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-6 py-10">
      <div className="flex flex-wrap items-center gap-4">
        <Link className="text-sm underline decoration-[var(--amber)] underline-offset-4" href="/">
          ← Tablero
        </Link>
        <Link className="text-sm underline decoration-[var(--amber)] underline-offset-4" href="/settings">
          Ajustes
        </Link>
      </div>
      <h1 className="mt-4 font-[family-name:var(--font-serif)] text-4xl">Catálogo</h1>
      <p className="mt-2 max-w-2xl text-[var(--ink-soft)]">
        Inventario en <code className="font-mono text-sm">~/.projecthub</code>. Los repos de Git también salen en el tablero (filtro{" "}
        <strong>Solo Git</strong>) con columna y notas, aunque no haya carpeta. Clona eligiendo destino; borrar en local no es la
        papelera.
      </p>
      <p className="mt-2 text-sm text-[var(--ink-soft)]">
        {catalog.length} guardados · {withRemote} con GitHub/Git
      </p>

      <form className="paper-strip mt-6 flex flex-wrap items-end gap-2 rounded-lg p-4" onSubmit={addUrl}>
        <label className="min-w-64 flex-1 text-sm">
          Añadir URL de Git
          <input
            className="mt-1 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2 font-mono text-sm"
            placeholder="https://github.com/usuario/repo"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </label>
        <button className="rounded-md bg-[var(--ink)] px-4 py-2 text-[var(--paper)]" type="submit" disabled={busy}>
          Guardar
        </button>
        <button className="rounded-md border border-[var(--ink)] px-4 py-2" type="button" onClick={importGithub} disabled={busy}>
          Traer mis repos de GitHub
        </button>
      </form>

      <input
        className="mt-6 w-full rounded-full border border-[var(--rule)] bg-[var(--card)] px-4 py-2"
        placeholder="Filtrar por nombre, ruta o URL…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {message ? <p className="mt-3 text-sm">{message}</p> : null}

      <ul className="mt-6 space-y-2">
        {visible.map((entry) => (
          <li key={entry.id} className="paper-strip flex flex-wrap items-start justify-between gap-3 rounded-lg p-4">
            <div className="min-w-0 flex-1">
              <h2 className="font-[family-name:var(--font-serif)] text-xl">{entry.name}</h2>
              {entry.path ? <p className="mt-1 break-all font-mono text-[11px] text-[var(--ink-soft)]">{entry.path}</p> : null}
              {entry.remoteUrl ? (
                <p className="mt-1 break-all font-mono text-[11px] text-[var(--moss)]">{entry.remoteUrl}</p>
              ) : (
                <p className="mt-1 text-xs text-[var(--ink-soft)]">Sin remoto</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1 text-xs">
                {entry.source === "github" ? <span className="chip chip-live">GitHub</span> : null}
                {entry.trashed ? <span className="chip chip-gone">Papelera</span> : null}
                {entry.missing && !entry.trashed ? <span className="chip chip-gone">Sin carpeta</span> : null}
                {entry.boardId && !entry.trashed && !entry.missing ? <span className="chip chip-draft">En tablero</span> : null}
              </div>
            </div>
            {entry.remoteUrl ? (
              <button className="rounded-md bg-[var(--ink)] px-3 py-2 text-sm text-[var(--paper)]" type="button" onClick={() => setCloning(entry)}>
                Descargar
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {cloning?.remoteUrl ? (
        <CloneDialog
          name={cloning.name}
          catalogId={cloning.id}
          url={cloning.remoteUrl}
          defaultParent={cloneRoot}
          onClose={() => setCloning(null)}
          onCloned={(_project, entry) => {
            setCatalog((current) => current.map((item) => (item.id === entry.id ? entry : item)));
            setCloning(null);
            setMessage(`Clonado en ${entry.path}`);
          }}
          onToast={setMessage}
        />
      ) : null}
    </div>
  );
}
