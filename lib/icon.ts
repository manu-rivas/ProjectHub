import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { extname, join } from "node:path";

export const ICON_DIR = join(homedir(), ".projecthub", "icons");

export const ICON_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

const EXT_FROM_TYPE: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
};

export function normalizeIcon(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 12) return null;
  if (/[\u0000-\u001f\\/]/.test(trimmed)) return null;
  return trimmed;
}

export function iconPath(projectId: string, ext: string): string {
  const suffix = ext.startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  return join(ICON_DIR, `${projectId}${suffix}`);
}

export function findIconFile(projectId: string): string | null {
  if (!existsSync(ICON_DIR)) return null;
  const prefix = `${projectId}.`;
  const match = readdirSync(ICON_DIR).find((name) => name.startsWith(prefix));
  return match ? join(ICON_DIR, match) : null;
}

export function removeIconFiles(projectId: string): void {
  if (!existsSync(ICON_DIR)) return;
  const prefix = `${projectId}.`;
  for (const name of readdirSync(ICON_DIR)) {
    if (name.startsWith(prefix)) unlinkSync(join(ICON_DIR, name));
  }
}

export function writeIconFile(projectId: string, bytes: Buffer, contentType: string): string {
  const ext = EXT_FROM_TYPE[contentType] || extnameFromName(contentType);
  if (!ext || !ICON_TYPES[ext]) {
    throw new Error("Use PNG, JPEG, WebP, GIF, or SVG");
  }
  mkdirSync(ICON_DIR, { recursive: true });
  removeIconFiles(projectId);
  const target = iconPath(projectId, ext);
  writeFileSync(target, bytes);
  return ext.slice(1);
}

function extnameFromName(value: string): string {
  const ext = extname(value).toLowerCase();
  return ICON_TYPES[ext] ? ext : "";
}
