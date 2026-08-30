# ProjectHub

A local studio board for people who vibe-code too many projects.

Scan folders, pin GitHub remotes that are not on disk, park ideas on a card, write the README from the same window, and start the project without hunting for the folder.

ProjectHub is a personal Next.js app that runs on `127.0.0.1`. It is not a hosted SaaS. Your board lives in `~/.projecthub`.

## Why it exists

Vibe coding makes it cheap to start a repo and expensive to remember what it was for. ProjectHub is the index-card wall: columns for status, a pane for notes and docs, and actions to open or start the thing again.

## Features

- Kanban board with color-coded cards
- Scan local folders (git repos and common project markers)
- Import GitHub remotes that are not cloned yet
- Create a new project from a markdown template (`README.md`, `PRODUCT.md`, `AGENTS.md`)
- Edit those files in the side pane
- Per-project Trello-style board (columns, colors, labels)
- First-run setup that checks Node, Git, pnpm, optional `gh` and Portless
- Backend picker: local JSON, SQLite, GitHub, or Supabase
- Actions: start `dev` / `start`, open Cursor, VS Code, the folder, or a terminal, plus custom commands
- Local trash that moves folders on disk (with a typed confirmation)

## Requirements

- Node.js 22+
- [pnpm](https://pnpm.io)
- Optional: [GitHub CLI](https://cli.github.com/) for GitHub import and board sync
- Optional: Cursor, VS Code, or Codex installed if you want those open buttons

## Install

```bash
git clone https://github.com/YOUR_USER/projecthub.git
cd projecthub
pnpm install
pnpm dev
```

Open [http://127.0.0.1:3456](http://127.0.0.1:3456).

On first launch, a setup screen checks this machine (Node, Git, pnpm, plus optional `gh` and [Portless](https://github.com/vercel-labs/portless)) and lets you pick a backend.

If Portless is installed **and** you turn it on in setup, `pnpm dev` opens `https://projecthub.localhost`. If Portless is missing, ProjectHub stays on [http://127.0.0.1:3456](http://127.0.0.1:3456). It never requires Portless.

macOS: double-click `Arrancar ProjectHub.command` or `Start ProjectHub.command`. Re-run setup anytime at `/setup`.

## Data

| Path | Role |
| --- | --- |
| `~/.projecthub/store.json` | Always written. Safe backup and the default backend. |
| `~/.projecthub/catalog.json` | Export of the catalog |
| `~/.projecthub/hub.db` | Optional SQLite copy |
| `~/.projecthub/secrets.json` | Supabase URL and key. Never synced to GitHub. |
| `~/.projecthub/sync/` | Local clone of the optional `projecthub-data` GitHub repo |

Pick one live backend in setup: local JSON, SQLite, GitHub (`gh`), or Supabase. JSON is always written as a backup.

Existing boards keep working. Initializing SQLite copies the current store; it does not delete JSON. Column titles you already renamed stay as they are.

## Per-project board

Each project has its own Trello-style board (Backlog / Doing / Done by default). Add columns, drag cards, set color and labels. This is separate from the studio wall of projects.

## Templates

When you create a project from the board, pick one of:

- **Blank** — empty README / PRODUCT / AGENTS
- **Web app** — how to run it, what it promises
- **Library** — API-first docs
- **Experiment** — hypothesis and keep/kill
- **Agent / MCP** — tools and hard limits

You can also open an existing project and create missing markdown from the same templates.

## Project actions

If the folder has a `package.json` with `dev`, `start`, `preview`, or `storybook`, ProjectHub shows a start button. Add your own command (one line, run from the project folder).

## GitHub backend

ProjectHub never stores a token. If `gh auth login` is done, **Sync** creates or updates a private `projecthub-data` repo and writes `board.json` there. That is optional. The local store is enough.

## Safety

Trash and local-delete are destructive on disk. Trash asks you to type `MOVE TO TRASH`. The older Spanish phrase `MOVER A PAPELERA` is still accepted.

## Scripts

```bash
pnpm dev      # 127.0.0.1:3456
pnpm build
pnpm start
pnpm lint
```

## License

MIT
