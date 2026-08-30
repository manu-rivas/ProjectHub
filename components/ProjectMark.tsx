"use client";

import type { Project } from "@/lib/types";
import { useState, type CSSProperties } from "react";
import { PresetGlyph, hasDrawnGlyph } from "./PresetGlyph";

export function ProjectMark({
  project,
  size = "md",
}: {
  project: Project;
  size?: "sm" | "md";
}) {
  const px = size === "sm" ? 44 : 56;
  const box: CSSProperties = {
    width: px,
    height: px,
    minWidth: px,
    minHeight: px,
    fontSize: size === "sm" ? 22 : 30,
    lineHeight: 1,
  };
  const className =
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--card)] ring-2 ring-[color-mix(in_srgb,var(--ink)_20%,transparent)]";
  const pictureSrc =
    project.iconDataUrl ||
    (project.iconExt ? `/api/projects/${encodeURIComponent(project.id)}/icon?v=${encodeURIComponent(project.updatedAt)}` : "");
  const [failedSrc, setFailedSrc] = useState("");

  if (project.icon) {
    return (
      <span className={className} style={box} aria-hidden>
        {hasDrawnGlyph(project.icon) ? (
          <PresetGlyph icon={project.icon} />
        ) : (
          <span className="project-mark-emoji">{project.icon}</span>
        )}
      </span>
    );
  }

  if (pictureSrc && failedSrc !== pictureSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={pictureSrc}
        alt=""
        width={px}
        height={px}
        className={`${className} object-cover`}
        style={box}
        onError={() => setFailedSrc(pictureSrc)}
      />
    );
  }

  return (
    <span className={`${className} font-[family-name:var(--font-serif)] text-[var(--ink-soft)]`} style={box} aria-hidden>
      {project.name.slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}
