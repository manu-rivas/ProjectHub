"use client";

import { api } from "@/lib/client";
import type { DocFileName } from "@/lib/types";
import { DOC_FILES } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

type Listed = {
  id: string;
  name: string;
  description: string;
  files: Record<DocFileName, string>;
  builtin: boolean;
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Listed[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<Record<DocFileName, string>>({
    "README.md": "",
    "PRODUCT.md": "",
    "AGENTS.md": "",
  });
  const [doc, setDoc] = useState<DocFileName>("README.md");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = templates.find((item) => item.id === selectedId) || null;
  const mine = selected && !selected.builtin;

  function applyList(next: Listed[], preferId?: string) {
    setTemplates(next);
    const current = next.find((item) => item.id === (preferId || selectedId)) || next[0] || null;
    setSelectedId(current?.id ?? null);
    if (current) {
      setName(current.name);
      setDescription(current.description);
      setFiles(current.files);
    }
  }

  useEffect(() => {
    api<{ templates: Listed[] }>("/api/templates")
      .then((data) => applyList(data.templates))
      .catch((error) => setMessage(error instanceof Error ? error.message : "Could not load templates"));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once
  }, []);

  function select(item: Listed) {
    setSelectedId(item.id);
    setName(item.name);
    setDescription(item.description);
    setFiles(item.files);
    setMessage(null);
  }

  async function create(fromId?: string) {
    setBusy(true);
    try {
      const result = await api<{ template: Listed; templates: Listed[] }>("/api/templates", {
        method: "POST",
        body: JSON.stringify(fromId ? { fromId } : { name: "My template" }),
      });
      applyList(result.templates, result.template.id);
      setMessage(fromId ? "Copied into your templates." : "New template created.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create the template");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!selected || selected.builtin) return;
    setBusy(true);
    try {
      const result = await api<{ templates: Listed[] }>("/api/templates", {
        method: "PATCH",
        body: JSON.stringify({ id: selected.id, name, description, files }),
      });
      applyList(result.templates, selected.id);
      setMessage("Template saved. New projects can use it.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!selected || selected.builtin) return;
    if (!window.confirm(`Delete “${selected.name}”?`)) return;
    setBusy(true);
    try {
      const result = await api<{ templates: Listed[] }>("/api/templates", {
        method: "DELETE",
        body: JSON.stringify({ id: selected.id }),
      });
      applyList(result.templates);
      setMessage("Template removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <Link className="text-sm underline decoration-[var(--amber)] underline-offset-4" href="/">
        ← Board
      </Link>
      {" · "}
      <Link className="text-sm underline decoration-[var(--amber)] underline-offset-4" href="/settings">
        Settings
      </Link>
      <p className="mt-6 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Docs</p>
      <h1 className="mt-1 font-[family-name:var(--font-serif)] text-4xl">My doc templates</h1>
      <p className="mt-3 max-w-2xl text-[var(--ink-soft)]">
        These fill README.md, PRODUCT.md, and AGENTS.md when you create a project or seed the wiki. Built-in templates
        stay as they are. Copy one, or write your own. Use <code className="font-mono text-sm">{"{{name}}"}</code> for
        the project name. Link pages with <code className="font-mono text-sm">{"[[PRODUCT]]"}</code>.
      </p>
      {message ? <p className="mt-4 rounded-md bg-[var(--ink)] px-4 py-2 text-sm text-[var(--paper)]">{message}</p> : null}
      <div className="mt-8 grid gap-6 md:grid-cols-[16rem_1fr]">
        <aside className="space-y-2">
          <button
            className="w-full rounded-md bg-[var(--ink)] px-3 py-2 text-sm text-[var(--paper)] disabled:opacity-40"
            type="button"
            disabled={busy}
            onClick={() => void create()}
          >
            New template
          </button>
          {templates.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`block w-full rounded-md border px-3 py-2 text-left text-sm ${
                item.id === selectedId ? "border-[var(--ink)] bg-[var(--card)]" : "border-[var(--rule)]"
              }`}
              onClick={() => select(item)}
            >
              <strong>{item.name}</strong>
              <span className="mt-0.5 block text-xs text-[var(--ink-soft)]">{item.builtin ? "Built-in" : "Yours"}</span>
            </button>
          ))}
        </aside>
        {selected ? (
          <div className="paper-strip rounded-xl p-5">
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-serif)] text-3xl outline-none disabled:opacity-70"
                value={name}
                disabled={!mine}
                onChange={(event) => setName(event.target.value)}
              />
              {selected.builtin ? (
                <button className="rounded-md border border-[var(--ink)] px-3 py-1.5 text-sm" type="button" disabled={busy} onClick={() => void create(selected.id)}>
                  Copy to mine
                </button>
              ) : (
                <>
                  <button className="rounded-md bg-[var(--ink)] px-3 py-1.5 text-sm text-[var(--paper)]" type="button" disabled={busy} onClick={() => void save()}>
                    Save
                  </button>
                  <button className="text-sm text-[var(--clay)]" type="button" disabled={busy} onClick={() => void remove()}>
                    Delete
                  </button>
                </>
              )}
            </div>
            <textarea
              className="mt-3 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2 text-sm disabled:opacity-70"
              value={description}
              disabled={!mine}
              onChange={(event) => setDescription(event.target.value)}
            />
            <div className="mt-4 flex gap-2">
              {DOC_FILES.map((file) => (
                <button
                  key={file}
                  type="button"
                  className={`rounded-full border px-3 py-1 text-sm ${
                    doc === file ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]" : "border-[var(--rule)]"
                  }`}
                  onClick={() => setDoc(file)}
                >
                  {file.replace(/\.md$/i, "")}
                </button>
              ))}
            </div>
            <textarea
              className="notes mt-3 min-h-80 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] p-3 font-mono text-sm disabled:opacity-70"
              value={files[doc]}
              disabled={!mine}
              onChange={(event) => setFiles((current) => ({ ...current, [doc]: event.target.value }))}
            />
          </div>
        ) : (
          <p className="text-[var(--ink-soft)]">No templates yet.</p>
        )}
      </div>
    </div>
  );
}
