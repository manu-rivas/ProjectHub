"use client";

import { api } from "@/lib/client";
import type { DocPreview, Project } from "@/lib/types";
import {
  expandWikiLinks,
  isWikiFileName,
  matchWikiPage,
  sortWikiPages,
  wikiTitle,
  wikiToc,
  WIKI_HOME,
} from "@/lib/wiki";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MarkdownView } from "./MarkdownView";

type TemplateInfo = { id: string; name: string; description: string };

const FALLBACK_PAGES: DocPreview[] = WIKI_HOME.map((name) => ({ name, exists: false, excerpt: "" }));

export function ProjectWiki({
  project,
  docs,
  onDisk,
  onChange,
  onDocs,
  onToast,
}: {
  project: Project;
  docs: DocPreview[];
  onDisk: boolean;
  onChange: (project: Project) => void;
  onDocs: (docs: DocPreview[]) => void;
  onToast: (message: string) => void;
}) {
  const [pageName, setPageName] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [templateId, setTemplateId] = useState("web-app");
  const [newName, setNewName] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/templates")
      .then((response) => response.json())
      .then((data: { templates?: TemplateInfo[] }) => {
        if (!cancelled && data.templates?.length) setTemplates(data.templates);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const pages = useMemo(() => {
    const base = sortWikiPages(docs.length ? docs : FALLBACK_PAGES);
    if (!pageName || matchWikiPage(base, pageName)) return base;
    return [...base, { name: pageName, exists: false, excerpt: "" }];
  }, [docs, pageName]);

  const first = pages.find((page) => page.exists) || pages[0];
  const resolvedName = pageName || first?.name || "README.md";
  const page = matchWikiPage(pages, resolvedName) || { name: resolvedName, exists: false, excerpt: "" };
  const toc = wikiToc(page.excerpt || "");
  const shown = pages.filter((item) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return `${item.name} ${wikiTitle(item.name, item.excerpt)}`.toLowerCase().includes(needle);
  });

  function openPage(name: string, hash?: string) {
    const existing = matchWikiPage(pages, name);
    const file = existing?.name || name;
    setPageName(file);
    setEditing(false);
    setDraft(existing?.excerpt || "");
    if (hash) {
      window.setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 40);
    }
  }

  async function applyDocs(body: Record<string, unknown>) {
    const result = await api<{ project: Project; docs: DocPreview[]; written: string[] }>(
      `/api/projects/${project.id}/docs`,
      { method: "POST", body: JSON.stringify(body) },
    );
    onChange(result.project);
    onDocs(result.docs);
    return result;
  }

  async function savePage(name: string, content: string) {
    try {
      await applyDocs({ name, content });
      setEditing(false);
      setPageName(name);
      onToast(`Saved ${name}`);
      return true;
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Could not save the page");
      return false;
    }
  }

  async function createFromTemplate() {
    try {
      const result = await applyDocs({ templateId, overwrite: false });
      const next = result.written[0] || result.docs.find((item) => item.exists)?.name;
      if (next) setPageName(next);
      onToast(result.written.length ? `Wrote ${result.written.join(", ")}` : "Those files already exist");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Could not create docs");
    }
  }

  async function createPage(raw: string) {
    const trimmed = raw.trim().replace(/\.md$/i, "");
    const name = `${trimmed}.md`;
    if (!isWikiFileName(name)) {
      onToast("Use a name like NOTES.md");
      return;
    }
    const ok = await savePage(name, `# ${trimmed}\n\n`);
    if (ok) setNewName("");
  }

  return (
    <div className="flex h-full min-h-0">
      <nav className="flex w-[15.5rem] shrink-0 flex-col border-r border-[var(--rule)] bg-[color-mix(in_srgb,var(--paper)_70%,var(--card))]">
        <div className="border-b border-[var(--rule)] px-3 py-3">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[var(--ink-soft)]">Wiki</p>
          <input
            className="mt-2 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-2 py-1 text-sm"
            placeholder="Find a page…"
            aria-label="Find a wiki page"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {shown.length === 0 ? <p className="px-2 py-3 text-sm text-[var(--ink-soft)]">No matching pages.</p> : null}
          {shown.map((item) => {
            const active = item.name.toLowerCase() === resolvedName.toLowerCase();
            return (
              <button
                key={item.name}
                type="button"
                className={`mb-0.5 block w-full rounded-md px-2 py-1.5 text-left text-sm ${
                  active ? "bg-[var(--ink)] text-[var(--paper)]" : "hover:bg-[var(--card)]"
                }`}
                aria-current={active ? "page" : undefined}
                onClick={() => openPage(item.name)}
              >
                <span className="block truncate font-semibold">{wikiTitle(item.name, item.excerpt)}</span>
                <span className={`block truncate font-mono text-[10px] ${active ? "text-[var(--paper)]/70" : "text-[var(--ink-soft)]"}`}>
                  {item.name}
                  {item.exists ? "" : " · missing"}
                </span>
              </button>
            );
          })}
        </div>
        {onDisk ? (
          <form
            className="border-t border-[var(--rule)] p-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (newName.trim()) void createPage(newName);
            }}
          >
            <input
              className="w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-2 py-1 text-sm"
              placeholder="New page…"
              aria-label="New wiki page name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
            />
            <button className="mt-1 w-full rounded-md border border-[var(--ink)] py-1 text-sm" type="submit">
              Add page
            </button>
          </form>
        ) : null}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b border-[var(--rule)] px-5 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[var(--ink-soft)]">
              {project.name} / wiki
            </p>
            <h2 className="truncate font-[family-name:var(--font-serif)] text-2xl">{wikiTitle(page.name, page.excerpt)}</h2>
          </div>
          <Link className="text-sm text-[var(--amber)]" href="/templates">
            Templates
          </Link>
          {page.exists ? (
            <>
              <button
                className="text-sm text-[var(--amber)]"
                type="button"
                onClick={() => {
                  setDraft(page.excerpt || "");
                  setEditing((current) => !current);
                }}
              >
                {editing ? "View" : "Edit"}
              </button>
              {editing ? (
                <button className="rounded-md bg-[var(--ink)] px-3 py-1 text-sm text-[var(--paper)]" type="button" onClick={() => void savePage(page.name, draft)}>
                  Save
                </button>
              ) : null}
            </>
          ) : null}
        </header>

        <div className="flex min-h-0 flex-1">
          <article className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
            {page.exists && !editing ? (
              <div className="mx-auto max-w-3xl">
                <MarkdownView
                  markdown={expandWikiLinks(page.excerpt || "")}
                  projectId={project.id}
                  onWikiLink={(file, hash) => {
                    if (!file && hash) {
                      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
                      return;
                    }
                    if (file) openPage(file, hash);
                  }}
                />
              </div>
            ) : page.exists && editing ? (
              <div className="mx-auto max-w-3xl">
                <p className="mb-2 text-xs text-[var(--ink-soft)]">
                  Wiki links: <code className="font-mono">[[PRODUCT]]</code> or <code className="font-mono">[text](AGENTS.md)</code>
                </p>
                <textarea
                  className="notes min-h-[28rem] w-full resize-y rounded-md border border-[var(--rule)] bg-[var(--card)] p-3 font-mono text-sm"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
              </div>
            ) : (
              <div className="mx-auto max-w-xl space-y-3 text-sm">
                <p className="text-[var(--ink-soft)]">
                  {page.name} is not in the project yet. Create this page, or seed README, PRODUCT, and AGENTS from a
                  template.
                </p>
                {onDisk ? (
                  <>
                    <button
                      className="rounded-md border border-[var(--ink)] px-3 py-2"
                      type="button"
                      onClick={() => void savePage(page.name, `# ${wikiTitle(page.name)}\n\n`)}
                    >
                      Create {page.name}
                    </button>
                    <label className="mt-4 block">
                      Template
                      <select
                        className="mt-1 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2"
                        value={templateId}
                        onChange={(event) => setTemplateId(event.target.value)}
                      >
                        {(templates.length ? templates : [{ id: "web-app", name: "Web app", description: "" }]).map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="rounded-md bg-[var(--ink)] px-3 py-2 text-[var(--paper)]" type="button" onClick={() => void createFromTemplate()}>
                      Create docs from template
                    </button>
                  </>
                ) : (
                  <p className="text-[var(--ink-soft)]">Clone with GitHub CLI or create a local folder first.</p>
                )}
              </div>
            )}
          </article>
          {page.exists && !editing && toc.length > 1 ? (
            <aside className="hidden w-48 shrink-0 overflow-y-auto border-l border-[var(--rule)] px-3 py-4 lg:block">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-[var(--ink-soft)]">On this page</p>
              <ul className="mt-2 space-y-1">
                {toc.map((item) => (
                  <li key={`${item.id}-${item.text}`} style={{ paddingLeft: (item.level - 1) * 8 }}>
                    <a
                      className="block truncate text-xs text-[var(--ink-soft)] hover:text-[var(--ink)]"
                      href={`#${item.id}`}
                      onClick={(event) => {
                        event.preventDefault();
                        document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
