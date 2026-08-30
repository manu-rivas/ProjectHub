"use client";

import { api } from "@/lib/client";
import { isPresetIcon, PRESET_ICONS } from "@/lib/preset-icons";
import type { Project } from "@/lib/types";
import { useState } from "react";
import { PresetGlyph } from "./PresetGlyph";

const FILE_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/x-icon,.png,.jpg,.jpeg,.webp,.gif,.svg,.ico";

export function IconPicker({
  project,
  onChange,
  onToast,
}: {
  project: Project;
  onChange: (project: Project) => void;
  onToast: (message: string) => void;
}) {
  const ownGlyph = project.icon && !isPresetIcon(project.icon) ? project.icon : "";
  const [typed, setTyped] = useState<string | null>(null);
  const fieldValue = typed ?? ownGlyph;
  const ownSelected = Boolean(ownGlyph) && typed === null;

  async function pickIcon(glyph: string) {
    try {
      const result = await api<{ project: Project }>(`/api/projects/${project.id}/icon`, {
        method: "POST",
        body: JSON.stringify({ emoji: glyph }),
      });
      setTyped(null);
      onChange(result.project);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Could not save the icon");
    }
  }

  async function pickPicture(file: File) {
    try {
      const body = new FormData();
      body.append("file", file);
      const result = await api<{ project: Project }>(`/api/projects/${project.id}/icon`, {
        method: "POST",
        body,
      });
      setTyped(null);
      onChange(result.project);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Could not save the icon");
    }
  }

  async function clear() {
    try {
      const result = await api<{ project: Project }>(`/api/projects/${project.id}/icon`, { method: "DELETE" });
      setTyped(null);
      onChange(result.project);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Could not remove the icon");
    }
  }

  function applyOwnIcon() {
    const glyph = fieldValue.trim();
    if (!glyph) {
      onToast("Paste an emoji or symbol, or upload a file");
      return;
    }
    void pickIcon(glyph);
  }

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Icon or picture</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {PRESET_ICONS.map((item) => {
          const selected = project.icon === item && !project.iconExt;
          return (
            <button
              key={item}
              type="button"
              className={`flex h-9 w-9 items-center justify-center rounded-md border text-[1.15rem] ${
                selected
                  ? "border-[var(--ink)] bg-[var(--card)] ring-2 ring-[var(--amber)]"
                  : "border-[var(--rule)] bg-[var(--card)]"
              }`}
              aria-label={`Use icon ${item}`}
              aria-pressed={selected}
              onClick={() => void pickIcon(item)}
            >
              <PresetGlyph icon={item} />
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[var(--ink-soft)]">Your own icon</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`own-icon-${project.id}`}>
          Paste your emoji or symbol
        </label>
        <input
          id={`own-icon-${project.id}`}
          className={`project-mark-emoji h-9 w-16 rounded-md border bg-[var(--card)] px-2 text-center text-lg ${
            ownSelected ? "border-[var(--ink)] ring-2 ring-[var(--amber)]" : "border-[var(--rule)]"
          }`}
          value={fieldValue}
          maxLength={16}
          placeholder="🐙"
          spellCheck={false}
          aria-label="Your own emoji or symbol"
          onChange={(event) => setTyped(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              applyOwnIcon();
            }
          }}
        />
        <button
          className="rounded-md border border-[var(--ink)] bg-[var(--card)] px-3 py-1.5 text-sm"
          type="button"
          onClick={applyOwnIcon}
        >
          Use
        </button>
        <label className="inline-flex cursor-pointer items-center rounded-md border border-[var(--ink)] bg-[var(--ink)] px-3 py-1.5 text-sm text-[var(--paper)]">
          {project.iconExt ? "Replace file…" : "Upload file…"}
          <input
            className="sr-only"
            type="file"
            accept={FILE_ACCEPT}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void pickPicture(file);
              event.target.value = "";
            }}
          />
        </label>
        {project.icon || project.iconExt ? (
          <button className="text-sm text-[var(--clay)]" type="button" onClick={() => void clear()}>
            Remove
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-[var(--ink-soft)]">Paste any emoji, or upload PNG, SVG, ICO, JPEG, WebP, or GIF.</p>
    </div>
  );
}
