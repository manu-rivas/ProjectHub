import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

export type OpenTarget = "cursor" | "codex" | "finder" | "vscode" | "terminal";

function run(command: string, args: string[]): { ok: boolean; error: string } {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 8000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) return { ok: false, error: result.error.message };
  if (result.status !== 0) {
    return { ok: false, error: (result.stderr || result.stdout || "Command failed").trim() };
  }
  return { ok: true, error: "" };
}

function openFolder(path: string): { ok: boolean; error?: string } {
  if (process.platform === "darwin") {
    const result = run("open", [path]);
    return result.ok ? { ok: true } : { ok: false, error: result.error || "Could not open Finder" };
  }
  if (process.platform === "win32") {
    const result = run("explorer", [path]);
    return result.ok ? { ok: true } : { ok: false, error: result.error || "Could not open Explorer" };
  }
  const result = run("xdg-open", [path]);
  return result.ok ? { ok: true } : { ok: false, error: result.error || "Could not open the file manager" };
}

function openTerminal(path: string): { ok: boolean; error?: string } {
  if (process.platform === "darwin") {
    const result = run("open", ["-a", "Terminal", path]);
    return result.ok ? { ok: true } : { ok: false, error: result.error || "Could not open Terminal" };
  }
  if (process.platform === "win32") {
    const result = run("cmd", ["/c", "start", "cmd", "/k", `cd /d ${path}`]);
    return result.ok ? { ok: true } : { ok: false, error: result.error || "Could not open Command Prompt" };
  }
  for (const [command, args] of [
    ["x-terminal-emulator", ["--working-directory", path]],
    ["gnome-terminal", [`--working-directory=${path}`]],
    ["konsole", ["--workdir", path]],
    ["xfce4-terminal", [`--working-directory=${path}`]],
  ] as const) {
    const result = run(command, [...args]);
    if (result.ok) return { ok: true };
  }
  return { ok: false, error: "No terminal app found. Install a terminal or add a custom action." };
}

export function openProject(path: string, target: OpenTarget): { ok: boolean; error?: string } {
  if (!existsSync(path)) return { ok: false, error: "That path does not exist" };

  if (target === "cursor") {
    const result = run("cursor", ["-n", path]);
    return result.ok ? { ok: true } : { ok: false, error: result.error || "Could not open Cursor" };
  }

  if (target === "vscode") {
    const result = run("code", ["-n", path]);
    return result.ok ? { ok: true } : { ok: false, error: result.error || "Could not open VS Code" };
  }

  if (target === "finder") return openFolder(path);
  if (target === "terminal") return openTerminal(path);

  if (process.platform === "darwin") {
    const chatgpt = run("open", ["-a", "ChatGPT", path]);
    if (chatgpt.ok) return { ok: true };
    const bundle = run("open", ["-b", "com.openai.codex", path]);
    if (bundle.ok) return { ok: true };
    return { ok: false, error: chatgpt.error || bundle.error || "Codex / ChatGPT is not installed" };
  }
  const cli = run("codex", [path]);
  return cli.ok ? { ok: true } : { ok: false, error: cli.error || "Codex is not available on this system" };
}
