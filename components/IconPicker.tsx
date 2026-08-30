"use client";

import { api } from "@/lib/client";
import { PRESET_ICONS } from "@/lib/preset-icons";
import type { Project } from "@/lib/types";
import { PresetGlyph } from "./PresetGlyph";

export function IconPicker({
  project,
  onChange,
  onToast,
}: {
  project: Project;
  onChange: (project: Project) => void;
  onToast: (message: string) => void;
}) {
  async function pickIcon(glyph: string) {
    try {
      const result = await api<{ project: Project }>(`/api/projects/${project.id}/icon`, {
        method: "POST",
        body: JSON.stringify({ emoji: glyph }),
      });
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
      onChange(result.project);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Could not save the picture");
    }
  }

  async function clear() {
    try {
      const result = await api<{ project: Project }>(`/api/projects/${project.id}/icon`, { method: "DELETE" });
      onChange(result.project);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Could not remove the icon");
    }
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
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center rounded-md border border-[var(--ink)] bg-[var(--card)] px-3 py-1.5 text-sm">
          {project.iconExt ? "Replace picture…" : "Use a picture…"}
          <input
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
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
    </div>
  );
}
