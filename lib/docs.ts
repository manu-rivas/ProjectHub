import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { DOC_FILES, type DocFileName, type DocPreview } from "./types";
import { renderTemplateFiles } from "./templates";
import { isInside } from "./paths";

export class DocError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocError";
  }
}

const DOC_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*\.md$/;

export function isDocFileName(name: string): name is DocFileName {
  return (DOC_FILES as readonly string[]).includes(name);
}

export function assertDocName(name: string): string {
  const file = basename(name.trim());
  if (!DOC_NAME.test(file)) {
    throw new DocError("Markdown name must look like README.md");
  }
  return file;
}

export function listProjectDocs(projectPath: string): string[] {
  if (!projectPath || !existsSync(projectPath)) return [];
  try {
    return readdirSync(projectPath).filter((name) => name.endsWith(".md") && DOC_NAME.test(name));
  } catch {
    return [];
  }
}

export function readProjectDoc(projectPath: string, fileName: string, limit = 400_000): string {
  const name = assertDocName(fileName);
  const target = resolve(projectPath, name);
  if (!isInside(projectPath, target) || !existsSync(target)) return "";
  try {
    return readFileSync(target, "utf8").slice(0, limit);
  } catch {
    return "";
  }
}

export function writeProjectDoc(projectPath: string, fileName: string, content: string): string {
  if (!projectPath || !existsSync(projectPath)) {
    throw new DocError("Project folder is missing on disk");
  }
  const name = assertDocName(fileName);
  const target = resolve(projectPath, name);
  if (!isInside(projectPath, target)) throw new DocError("Refusing to write outside the project");
  writeFileSync(target, content.endsWith("\n") ? content : `${content}\n`);
  return name;
}

export function createDocsFromTemplate(projectPath: string, projectName: string, templateId: string, overwrite = false): string[] {
  const files = renderTemplateFiles(templateId, projectName);
  const written: string[] = [];
  for (const [name, body] of Object.entries(files)) {
    const target = join(projectPath, name);
    if (existsSync(target) && !overwrite) continue;
    writeProjectDoc(projectPath, name, body);
    written.push(name);
  }
  return written;
}

export function previewDocs(projectPath: string, known = [...DOC_FILES]): DocPreview[] {
  const onDisk = new Set(listProjectDocs(projectPath));
  const names = [...new Set([...known, ...onDisk])];
  return names.map((name) => ({
    name,
    exists: onDisk.has(name),
    excerpt: onDisk.has(name) ? readProjectDoc(projectPath, name) : "",
  }));
}
