import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

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
  if (!trimmed) return null;
  if (/[\u0000-\u001f\\/]/.test(trimmed)) return null;
  if ([...trimmed].length > 8 || trimmed.length > 32) return null;
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

export function sniffImageType(bytes: Buffer, declared = ""): string {
  const listed = declared.toLowerCase();
  if (EXT_FROM_TYPE[listed]) return listed;
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 6 && bytes.subarray(0, 6).toString("ascii") === "GIF87a") return "image/gif";
  if (bytes.length >= 6 && bytes.subarray(0, 6).toString("ascii") === "GIF89a") return "image/gif";
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }
  const head = bytes.subarray(0, 256).toString("utf8").trim().toLowerCase();
  if (head.startsWith("<svg") || head.includes("<svg")) return "image/svg+xml";
  return "";
}

export function writeIconFile(projectId: string, bytes: Buffer, contentType: string): string {
  const type = sniffImageType(bytes, contentType);
  const ext = EXT_FROM_TYPE[type];
  if (!ext || !ICON_TYPES[ext]) {
    throw new Error("Use PNG, JPEG, WebP, GIF, or SVG");
  }
  mkdirSync(ICON_DIR, { recursive: true });
  removeIconFiles(projectId);
  const target = iconPath(projectId, ext);
  writeFileSync(target, bytes);
  return ext.slice(1);
}
