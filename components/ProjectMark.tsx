import type { Project } from "@/lib/types";

export function ProjectMark({
  project,
  size = "md",
}: {
  project: Project;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-11 w-11 text-lg" : "h-14 w-14 text-3xl";
  if (project.iconExt) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/projects/${encodeURIComponent(project.id)}/icon?v=${encodeURIComponent(project.updatedAt)}`}
        alt=""
        className={`${dim} shrink-0 rounded-md object-cover ring-1 ring-[var(--rule)]`}
      />
    );
  }
  if (project.icon) {
    return (
      <span
        className={`${dim} inline-flex shrink-0 items-center justify-center rounded-md bg-[var(--paper-deep)] ring-1 ring-[var(--rule)]`}
        aria-hidden
      >
        {project.icon}
      </span>
    );
  }
  return (
    <span
      className={`${dim} inline-flex shrink-0 items-center justify-center rounded-md bg-[var(--paper-deep)] font-[family-name:var(--font-serif)] text-[var(--ink-soft)] ring-1 ring-[var(--rule)]`}
      aria-hidden
    >
      {project.name.slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}
