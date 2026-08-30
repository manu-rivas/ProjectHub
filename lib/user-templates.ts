import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { newId } from "./id";
import { PROJECT_TEMPLATES, fill, getTemplate, type ProjectTemplate } from "./templates";
import { DOC_FILES, type DocFileName } from "./types";

export type ListedTemplate = ProjectTemplate & { builtin: boolean };

const TEMPLATES_PATH = join(homedir(), ".projecthub", "doc-templates.json");

function emptyFiles(): Record<DocFileName, string> {
  return {
    "README.md": "# {{name}}\n\n",
    "PRODUCT.md": "# Product: {{name}}\n\n",
    "AGENTS.md": "# Agent notes: {{name}}\n\n",
  };
}

function normalizeFiles(files: unknown): Record<DocFileName, string> {
  const base = emptyFiles();
  if (!files || typeof files !== "object") return base;
  const record = files as Record<string, unknown>;
  for (const name of DOC_FILES) {
    if (typeof record[name] === "string") base[name] = record[name];
  }
  return base;
}

function normalizeMine(item: Partial<ProjectTemplate>): ProjectTemplate | null {
  if (!item || typeof item.id !== "string" || !item.id.trim()) return null;
  if (PROJECT_TEMPLATES.some((builtin) => builtin.id === item.id)) return null;
  return {
    id: item.id.trim(),
    name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : "My template",
    description: typeof item.description === "string" ? item.description : "",
    files: normalizeFiles(item.files),
  };
}

export function readMyTemplates(): ProjectTemplate[] {
  if (!existsSync(TEMPLATES_PATH)) return [];
  try {
    const parsed = JSON.parse(readFileSync(TEMPLATES_PATH, "utf8")) as { templates?: Partial<ProjectTemplate>[] };
    return (parsed.templates || []).map(normalizeMine).filter((item): item is ProjectTemplate => Boolean(item));
  } catch {
    return [];
  }
}

export function writeMyTemplates(templates: ProjectTemplate[]): ProjectTemplate[] {
  const mine = templates.map(normalizeMine).filter((item): item is ProjectTemplate => Boolean(item));
  mkdirSync(dirname(TEMPLATES_PATH), { recursive: true });
  writeFileSync(TEMPLATES_PATH, `${JSON.stringify({ templates: mine }, null, 2)}\n`);
  return mine;
}

export function listAllTemplates(): ListedTemplate[] {
  const mine = readMyTemplates().map((item) => ({ ...item, builtin: false as const }));
  const builtin = PROJECT_TEMPLATES.map((item) => ({ ...item, builtin: true as const }));
  return [...mine, ...builtin];
}

export function getAnyTemplate(id: string | null | undefined): ListedTemplate {
  const all = listAllTemplates();
  return all.find((item) => item.id === id) || { ...getTemplate(id), builtin: true };
}

export function renderAnyTemplate(templateId: string | null | undefined, name: string): Record<DocFileName, string> {
  const template = getAnyTemplate(templateId);
  const vars = { name };
  return {
    "README.md": fill(template.files["README.md"], vars),
    "PRODUCT.md": fill(template.files["PRODUCT.md"], vars),
    "AGENTS.md": fill(template.files["AGENTS.md"], vars),
  };
}

export function createMyTemplate(input: { name?: string; description?: string; files?: Record<string, string>; fromId?: string }): ProjectTemplate {
  const source = input.fromId ? getAnyTemplate(input.fromId) : null;
  const created: ProjectTemplate = {
    id: newId("tpl"),
    name: input.name?.trim() || (source ? `${source.name} copy` : "My template"),
    description: input.description?.trim() || source?.description || "Custom README, PRODUCT, and AGENTS.",
    files: normalizeFiles(input.files || source?.files),
  };
  writeMyTemplates([...readMyTemplates(), created]);
  return created;
}

export function updateMyTemplate(id: string, patch: Partial<ProjectTemplate>): ProjectTemplate {
  const mine = readMyTemplates();
  const index = mine.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("That template is not one of yours");
  const next = normalizeMine({ ...mine[index], ...patch, id }) || mine[index];
  mine[index] = next;
  writeMyTemplates(mine);
  return next;
}

export function deleteMyTemplate(id: string): void {
  const mine = readMyTemplates();
  if (!mine.some((item) => item.id === id)) throw new Error("That template is not one of yours");
  writeMyTemplates(mine.filter((item) => item.id !== id));
}
