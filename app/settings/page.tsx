"use client";

import { api } from "@/lib/client";
import type { PublicSettings } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

export default function SettingsPage() {
  const [roots, setRoots] = useState("");
  const [depth, setDepth] = useState(2);
  const [ignore, setIgnore] = useState("");
  const [trashPath, setTrashPath] = useState("");
  const [cloneRoot, setCloneRoot] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/board")
      .then((response) => response.json())
      .then((data: { settings: PublicSettings }) => {
        setRoots(data.settings.scanRoots.join("\n"));
        setDepth(data.settings.depth);
        setIgnore(data.settings.ignore.join("\n"));
        setTrashPath(data.settings.trashPath || "");
        setCloneRoot(data.settings.cloneRoot || "");
      })
      .catch(() => setMessage("No se pudieron cargar los ajustes"));
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({
          scanRoots: roots.split("\n").map((line) => line.trim()).filter(Boolean),
          depth,
          ignore: ignore.split("\n").map((line) => line.trim()).filter(Boolean),
          trashPath,
          cloneRoot,
        }),
      });
      setMessage("Ajustes guardados. Vuelve al tablero y escanea.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar");
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-6 py-10">
      <Link className="text-sm underline decoration-[var(--amber)] underline-offset-4" href="/">
        ← Tablero
      </Link>
      {" · "}
      <Link className="text-sm underline decoration-[var(--amber)] underline-offset-4" href="/catalogo">
        Catálogo
      </Link>
      <h1 className="mt-4 font-[family-name:var(--font-serif)] text-4xl">Ajustes</h1>
      <p className="mt-2 text-[var(--ink-soft)]">
        Carpetas de este Mac. El backend es siempre <code className="font-mono text-sm">tu-usuario/projecthub-data</code>{" "}
        con la cuenta de <code className="font-mono text-sm">gh auth login</code>. El catálogo local está en{" "}
        <code className="font-mono text-sm">~/.projecthub/store.json</code>.
      </p>
      <form className="paper-strip mt-8 space-y-5 rounded-lg p-5" onSubmit={save}>
        <label className="block">
          <span className="text-sm font-bold uppercase tracking-wider">Raíces a escanear</span>
          <textarea
            className="mt-2 h-40 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] p-3 font-mono text-sm"
            value={roots}
            onChange={(event) => setRoots(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold uppercase tracking-wider">Profundidad (1–3)</span>
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
          <span className="text-sm font-bold uppercase tracking-wider">Ignorar nombres</span>
          <textarea
            className="mt-2 h-32 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] p-3 font-mono text-sm"
            value={ignore}
            onChange={(event) => setIgnore(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-sm font-bold uppercase tracking-wider">Papelera (ruta en disco)</span>
          <input
            className="mt-2 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] p-3 font-mono text-sm"
            value={trashPath}
            onChange={(event) => setTrashPath(event.target.value)}
            placeholder="/Users/…/papelera"
          />
          <span className="mt-1 block text-xs text-[var(--ink-soft)]">
            Al enviar un proyecto aquí se mueve la carpeta y se le añade un hash al nombre. Se crea si no existe.
          </span>
        </label>
        <label className="block">
          <span className="text-sm font-bold uppercase tracking-wider">Destino por defecto al clonar</span>
          <input
            className="mt-2 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] p-3 font-mono text-sm"
            value={cloneRoot}
            onChange={(event) => setCloneRoot(event.target.value)}
            placeholder="/Users/…/Developer"
          />
        </label>
        <button className="rounded-md bg-[var(--ink)] px-4 py-2 text-[var(--paper)]" type="submit">
          Guardar
        </button>
        {message ? <p className="text-sm">{message}</p> : null}
      </form>
    </div>
  );
}
