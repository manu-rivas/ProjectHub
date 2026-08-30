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

function ensurePortlessLoopback() {
  try {
    const hosts = readFileSync("/etc/hosts", "utf8");
    if (!hosts.includes("projecthub.localhost")) {
      spawnSync("sudo", ["-n", "sh", "-c", "printf '127.0.0.1 projecthub.localhost\\n' >> /etc/hosts"], {
        stdio: "ignore",
      });
    }
  } catch {
    // glibc does not always resolve *.localhost; browsers usually do.
  }
}

const nextArgs = [mode, "--hostname", "127.0.0.1"];
const usePortless = wantsPortless();

if (usePortless) {
  console.log("Portless found · https://projecthub.localhost");
  const stateDir = join(homedir(), ".portless");
  const env = {
    ...process.env,
    HOME: homedir(),
    // Keep the app on 3456 so http://127.0.0.1:3456 still works.
    // Portless proxies https://projecthub.localhost to that port.
    PORTLESS_APP_PORT: "3456",
    PORT: "3456",
    // The HTTPS proxy may auto-elevate with sudo; keep routes in this user's
    // ~/.portless instead of /root/.portless (empty routes look like a 404/502).
    PORTLESS_STATE_DIR: stateDir,
  };
  delete env.CI;
  ensurePortlessLoopback();
  spawnSync(
    "sudo",
    [
      "-n",
      "env",
      `HOME=${homedir()}`,
      `PORTLESS_STATE_DIR=${stateDir}`,
      `PATH=${process.env.PATH || ""}`,
      "portless",
      "proxy",
      "start",
      "--port",
      "443",
      "--https",
      "--skip-trust",
    ],
    { stdio: "ignore", env },
  );
  const child = spawn("portless", ["projecthub", "next", ...nextArgs], {
    cwd: root,
    stdio: "inherit",
    env,
  });
  child.on("exit", (code) => process.exit(code ?? 1));
} else {
  if (existsSync(join(homedir(), ".projecthub", "store.json")) === false) {
    console.log("Starting on http://127.0.0.1:3456");
  }
  const child = spawn("pnpm", ["exec", "next", ...nextArgs, "--port", "3456"], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  child.on("exit", (code) => process.exit(code ?? 1));
}
