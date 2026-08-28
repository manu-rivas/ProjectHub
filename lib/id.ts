import { createHash } from "node:crypto";
import { resolve } from "node:path";

export function projectIdFromPath(projectPath: string): string {
  return createHash("sha256").update(resolve(projectPath)).digest("hex").slice(0, 20);
}

export function projectIdFromRemote(remoteUrl: string): string {
  return createHash("sha256").update(`remote:${remoteUrl.trim().toLowerCase()}`).digest("hex").slice(0, 20);
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
