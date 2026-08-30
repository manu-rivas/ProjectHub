import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { newId } from "./id";
import type { ProjectAction } from "./types";

export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

type PackageJson = {
  scripts?: Record<string, string>;
  packageManager?: string;
};

function detectPackageManager(dir: string): "pnpm" | "npm" | "yarn" | "bun" {
  if (existsSync(join(dir, "pnpm-lock.yaml")) || existsSync(join(dir, "pnpm-workspace.yaml"))) return "pnpm";
  if (existsSync(join(dir, "bun.lock")) || existsSync(join(dir, "bun.lockb"))) return "bun";
  if (existsSync(join(dir, "yarn.lock"))) return "yarn";
  return "npm";
}

function readPackageJson(dir: string): PackageJson | null {
  try {
    return JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as PackageJson;
  } catch {
    return null;
  }
}

export function detectedActions(projectPath: string): ProjectAction[] {
  if (!projectPath || !existsSync(projectPath)) return [];
  const pkg = readPackageJson(projectPath);
  if (!pkg?.scripts) return [];
  const pm = detectPackageManager(projectPath);
  const preferred = ["dev", "start", "preview", "storybook"];
  const found: ProjectAction[] = [];
  for (const script of preferred) {
    if (!pkg.scripts[script]) continue;
    found.push({
      id: `script:${script}`,
      label: script === "dev" ? "Start dev" : `Run ${script}`,
      command: `${pm} run ${script}`,
    });
  }
  return found;
}

export function mergeActions(custom: ProjectAction[] | undefined, detected: ProjectAction[]): ProjectAction[] {
  const byId = new Map<string, ProjectAction>();
  for (const action of detected) byId.set(action.id, action);
  for (const action of custom || []) {
    if (!action.id || !action.command?.trim()) continue;
    byId.set(action.id, action);
  }
  return [...byId.values()];
}

export function normalizeCustomAction(input: { id?: string; label?: string; command?: string }): ProjectAction {
  const command = input.command?.trim();
  if (!command) throw new ActionError("Action needs a command");
  if (/[\n\r]/.test(command)) throw new ActionError("Action command must be a single line");
  return {
    id: input.id?.trim() || newId("act"),
    label: input.label?.trim() || command,
    command,
  };
}

function shellWrapper(command: string): { file: string; args: string[] } {
  if (process.platform === "win32") {
    return { file: "cmd.exe", args: ["/d", "/s", "/c", command] };
  }
  return { file: "/bin/sh", args: ["-lc", command] };
}

export function runProjectAction(projectPath: string, command: string): { ok: true; pid: number } {
  if (!projectPath || !existsSync(projectPath)) {
    throw new ActionError("Project folder is missing on disk");
  }
  const trimmed = command.trim();
  if (!trimmed) throw new ActionError("Action needs a command");
  if (/[\n\r]/.test(trimmed)) throw new ActionError("Action command must be a single line");

  const { file, args } = shellWrapper(trimmed);
  const child = spawn(file, args, {
    cwd: projectPath,
    detached: true,
    stdio: "ignore",
    env: process.env,
  });
  child.unref();
  if (typeof child.pid !== "number") throw new ActionError("Could not start the command");
  return { ok: true, pid: child.pid };
}
