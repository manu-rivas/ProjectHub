"use client";

import { api } from "@/lib/client";
import type { Project } from "@/lib/types";
import { useEffect, useState } from "react";

type Mode = "create" | "folder" | "git";

type TemplateInfo = {
  id: string;
  name: string;
  description: string;
};

type Props = {
  cloneRoot: string;
  onClose: () => void;
  onCreated: (project: Project, message: string) => void;
  onToast: (message: string) => void;
};

export function CreateProjectDialog({ cloneRoot, onClose, onCreated, onToast }: Props) {
  const [mode, setMode] = useState<Mode>("create");
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [templateId, setTemplateId] = useState("web-app");
  const [name, setName] = useState("");
  const [parent, setParent] = useState(cloneRoot || "");
  const [path, setPath] = useState("");
  const [url, setUrl] = useState("");
  const [writeDocs, setWriteDocs] = useState(true);
  const [gitInit, setGitInit] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/templates")
      .then((response) => response.json())
      .then((data: { templates?: TemplateInfo[] }) => {
        if (data.templates?.length) setTemplates(data.templates);
      })
      .catch(() => undefined);
  }, []);

  async function pickParent() {
    try {
      const result = await api<{ path: string }>("/api/picker/folder", { method: "POST" });
      setParent(result.path);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "No folder was chosen");
    }
  }

  async function submit() {
    setBusy(true);
    try {
      if (mode === "create") {
        const data = await api<{ project: Project; createdDocs: string[] }>("/api/projects", {
          method: "POST",
          body: JSON.stringify({
            create: true,
            name,
            parent,
            templateId,
            writeDocs,
            gitInit,
          }),
        });
        const docs = data.createdDocs?.length ? ` · wrote ${data.createdDocs.join(", ")}` : "";
        onCreated(data.project, `Created ${data.project.name}${docs}`);
        return;
      }
      if (mode === "git") {
        const data = await api<{ project: Project }>("/api/catalog", {
          method: "POST",
          body: JSON.stringify({ url, name }),
        });
        onCreated(data.project, "Added from Git. There is no local folder yet.");
        return;
      }
      const data = await api<{ project: Project }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ path, name, templateId }),
      });
      onCreated(data.project, `Added ${data.project.name}`);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Could not add the project");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    mode === "create" ? Boolean(name.trim() && parent.trim()) : mode === "git" ? Boolean(url.trim()) : Boolean(path.trim());

  return (
    <div className="sheet-scrim fixed inset-0 z-40 flex items-center justify-center" onClick={onClose}>
      <form
        className="max-h-[92vh] w-[min(36rem,92vw)] overflow-y-auto rounded-lg bg-[var(--paper)] p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <h2 className="font-[family-name:var(--font-serif)] text-2xl">Add a project</h2>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          Create a new folder with docs, track an existing path, or pin a Git URL.
        </p>

        <div className="mt-4 flex rounded-full border border-[var(--rule)] p-0.5 text-sm">
          {(
            [
              ["create", "New"],
              ["folder", "Existing"],
              ["git", "Git URL"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`flex-1 rounded-full px-3 py-1 ${mode === value ? "bg-[var(--ink)] text-[var(--paper)]" : ""}`}
              onClick={() => setMode(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "create" ? (
          <>
            <label className="mt-4 block text-sm">
              Name
              <input
                className="mt-1 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="my-experiment"
                autoFocus
              />
            </label>
            <label className="mt-3 block text-sm">
              Parent folder
              <input
                className="mt-1 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2 font-mono text-sm"
                value={parent}
                onChange={(event) => setParent(event.target.value)}
                placeholder="~/Developer"
              />
            </label>
            <button className="mt-2 text-sm underline decoration-[var(--amber)] underline-offset-4" type="button" onClick={() => void pickParent()}>
              Choose folder…
            </button>
            <fieldset className="mt-4">
              <legend className="text-sm font-bold uppercase tracking-wider text-[var(--ink-soft)]">Template</legend>
              <div className="mt-2 grid gap-2">
                {templates.map((template) => (
                  <label
                    key={template.id}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      templateId === template.id ? "border-[var(--ink)] bg-[var(--card)]" : "border-[var(--rule)]"
                    }`}
                  >
                    <input
                      className="mr-2"
                      type="radio"
                      name="template"
                      checked={templateId === template.id}
                      onChange={() => setTemplateId(template.id)}
                    />
                    <strong>{template.name}</strong>
                    <span className="mt-0.5 block pl-6 text-[var(--ink-soft)]">{template.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={writeDocs} onChange={(event) => setWriteDocs(event.target.checked)} />
              Write README.md, PRODUCT.md, and AGENTS.md
            </label>
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={gitInit} onChange={(event) => setGitInit(event.target.checked)} />
              Run git init
            </label>
          </>
        ) : null}

        {mode === "folder" ? (
          <>
            <label className="mt-4 block text-sm">
              Local path
              <input
                className="mt-1 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2 font-mono text-sm"
                value={path}
                onChange={(event) => setPath(event.target.value)}
                placeholder="/Users/…/my-project"
              />
            </label>
            <label className="mt-3 block text-sm">
              Name (optional)
              <input
                className="mt-1 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          </>
        ) : null}

        {mode === "git" ? (
          <>
            <label className="mt-4 block text-sm">
              Git URL
              <input
                className="mt-1 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2 font-mono text-sm"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://github.com/you/repo"
              />
            </label>
            <label className="mt-3 block text-sm">
              Name (optional)
              <input
                className="mt-1 w-full rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 py-2"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          </>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="rounded-md bg-[var(--ink)] px-4 py-2 text-[var(--paper)] disabled:opacity-40" type="submit" disabled={busy || !canSubmit}>
            {busy ? "Working…" : mode === "create" ? "Create" : "Add"}
          </button>
        </div>
      </form>
    </div>
  );
}
