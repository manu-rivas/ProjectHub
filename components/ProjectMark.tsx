"use client";

import type { Project } from "@/lib/types";
import { useState } from "react";

export function ProjectMark({
  project,
  size = "md",
}: {
  project: Project;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-11 w-11 min-w-11 text-lg" : "h-14 w-14 min-w-14 text-3xl";
  const box = `${dim} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--card)] ring-2 ring-[var(--ink)]/20`;
  const [failedAt, setFailedAt] = useState("");

  if (project.icon) {
    return (
      <span className={box} aria-hidden>
        {project.icon}
      </span>
    );
  }

  if (project.iconExt && failedAt !== project.updatedAt) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/projects/${encodeURIComponent(project.id)}/icon?v=${encodeURIComponent(project.updatedAt)}`}
        alt=""
        className={`${box} object-cover`}
        onError={() => setFailedAt(project.updatedAt)}
      />
    );
  }

  return (
    <span
      className={`${box} font-[family-name:var(--font-serif)] text-[var(--ink-soft)]`}
      aria-hidden
    >
      {project.name.slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}
