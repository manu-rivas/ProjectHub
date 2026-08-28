import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

export type OpenTarget = "cursor" | "codex" | "finder";

function run(command: string, args: string[]): { ok: boolean; error: string } {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 8000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) return { ok: false, error: result.error.message };
  if (result.status !== 0) {
    return { ok: false, error: (result.stderr || result.stdout || "Falló el comando").trim() };
  }
  return { ok: true, error: "" };
}

export function openProject(path: string, target: OpenTarget): { ok: boolean; error?: string } {
  if (!existsSync(path)) return { ok: false, error: "La ruta no existe" };

  if (target === "cursor") {
    const result = run("cursor", ["-n", path]);
    return result.ok ? { ok: true } : { ok: false, error: result.error || "No se pudo abrir Cursor" };
  }

  if (target === "finder") {
    const result = run("open", [path]);
    return result.ok ? { ok: true } : { ok: false, error: result.error || "No se pudo abrir Finder" };
  }

  const chatgpt = run("open", ["-a", "ChatGPT", path]);
  if (chatgpt.ok) return { ok: true };
  const bundle = run("open", ["-b", "com.openai.codex", path]);
  if (bundle.ok) return { ok: true };
  return { ok: false, error: chatgpt.error || bundle.error || "No se encontró Codex en este Mac" };
}
