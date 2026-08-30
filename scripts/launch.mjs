#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const mode = args[0] === "start" ? "start" : "dev";

function hasCommand(command) {
  const finder = process.platform === "win32" ? "where" : "which";
  return spawnSync(finder, [command], { stdio: "ignore" }).status === 0;
}

function wantsPortless() {
  if (!hasCommand("portless")) return false;
  try {
    const raw = readFileSync(join(homedir(), ".projecthub", "store.json"), "utf8");
    const parsed = JSON.parse(raw);
    return Boolean(parsed?.settings?.usePortless);
  } catch {
    return false;
  }
}

const nextArgs = [mode, "--hostname", "127.0.0.1", "--port", "3456"];
const usePortless = wantsPortless();

if (usePortless) {
  console.log("Portless found · https://projecthub.localhost");
  const child = spawn("portless", ["projecthub", "next", ...nextArgs], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  child.on("exit", (code) => process.exit(code ?? 1));
} else {
  if (existsSync(join(homedir(), ".projecthub", "store.json")) === false) {
    console.log("Starting on http://127.0.0.1:3456");
  }
  const child = spawn("pnpm", ["exec", "next", ...nextArgs], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  child.on("exit", (code) => process.exit(code ?? 1));
}
