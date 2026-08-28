import { homedir } from "node:os";
import { join, resolve } from "node:path";

export function expandHome(input: string): string {
  const trimmed = input.trim();
  if (trimmed === "~") return homedir();
  if (trimmed.startsWith("~/")) return join(homedir(), trimmed.slice(2));
  return resolve(trimmed);
}

export function isInside(root: string, candidate: string): boolean {
  const base = resolve(expandHome(root));
  const full = resolve(expandHome(candidate));
  return full === base || full.startsWith(`${base}/`);
}
