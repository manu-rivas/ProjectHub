import { spawnSync } from "node:child_process";

export type DepStatus = {
  id: string;
  label: string;
  optional: boolean;
  ok: boolean;
  version: string;
  hint: string;
};

function which(command: string): string | null {
  const finder = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(finder, [command], {
    encoding: "utf8",
    timeout: 4000,
    stdio: ["ignore", "pipe", "ignore"],
  });
  const path = (result.stdout || "").trim().split("\n")[0];
  return result.status === 0 && path ? path : null;
}

function versionOf(command: string, args: string[]): string {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 5000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const text = `${result.stdout || ""} ${result.stderr || ""}`.trim();
  const match = text.match(/v?\d+\.\d+(?:\.\d+)?/);
  return match?.[0] || (result.status === 0 ? "ok" : "");
}

export function probeDependencies(): DepStatus[] {
  const nodeOk = Boolean(which("node"));
  const gitOk = Boolean(which("git"));
  const pnpmOk = Boolean(which("pnpm"));
  const ghPath = which("gh");
  let ghAuthed = false;
  if (ghPath) {
    const status = spawnSync("gh", ["auth", "status"], {
      encoding: "utf8",
      timeout: 6000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    ghAuthed = status.status === 0;
  }
  const portlessOk = Boolean(which("portless"));
  const cursorOk = Boolean(which("cursor"));

  return [
    {
      id: "node",
      label: "Node.js",
      optional: false,
      ok: nodeOk,
      version: nodeOk ? versionOf("node", ["-v"]) : "",
      hint: nodeOk ? "Required to run ProjectHub." : "Install Node 22+ from nodejs.org",
    },
    {
      id: "git",
      label: "Git",
      optional: false,
      ok: gitOk,
      version: gitOk ? versionOf("git", ["--version"]) : "",
      hint: gitOk ? "Used to clone and init projects." : "Install Git, then reopen this setup.",
    },
    {
      id: "pnpm",
      label: "pnpm",
      optional: false,
      ok: pnpmOk,
      version: pnpmOk ? versionOf("pnpm", ["-v"]) : "",
      hint: pnpmOk ? "Package manager for this app." : "corepack enable && corepack prepare pnpm@latest --activate",
    },
    {
      id: "gh",
      label: "GitHub CLI",
      optional: false,
      ok: Boolean(ghPath) && ghAuthed,
      version: ghPath ? versionOf("gh", ["--version"]) : "",
      hint: !ghPath
        ? "Required. ProjectHub uses gh to clone, import, and talk to GitHub. Install from cli.github.com"
        : ghAuthed
          ? "Signed in. You can clone, import repos, and use the GitHub backend."
          : "Installed, but not signed in. Run `gh auth login` so clones and imports work.",
    },
    {
      id: "portless",
      label: "Portless",
      optional: true,
      ok: portlessOk,
      version: portlessOk ? versionOf("portless", ["--version"]) : "",
      hint: portlessOk
        ? "Found. You can open ProjectHub at https://projecthub.localhost"
        : "Optional. Not installed, so ProjectHub will stay on http://127.0.0.1:3456",
    },
    {
      id: "cursor",
      label: "Cursor",
      optional: true,
      ok: cursorOk,
      version: "",
      hint: cursorOk ? "Open-in-Cursor buttons will work." : "Optional. Install Cursor to use that action.",
    },
  ];
}

export function hasCommand(command: string): boolean {
  return Boolean(which(command));
}
