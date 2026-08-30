# ProjectHub

A local studio board for people who vibe-code too many projects.

Scan folders, pin GitHub remotes that are not on disk, park ideas on a project page, write the README there, and start the project without hunting for the folder.

ProjectHub is a personal Next.js app that runs on `127.0.0.1`. It is not a hosted SaaS. Your board lives in `~/.projecthub`.

## Why it exists

Vibe coding makes it cheap to start a repo and expensive to remember what it was for. ProjectHub is the index-card wall: columns for status, a page per project for notes and docs, and actions to open or start the thing again.

## Features

- Kanban board with color-coded cards
- Scan local folders (git repos and common project markers)
- Import GitHub remotes that are not cloned yet
- Create a new project from a markdown template (`README.md`, `PRODUCT.md`, `AGENTS.md`)
- Open a project page for its board, notes, docs, and actions
- Per-project Trello-style board (columns, colors, labels)
- First-run setup that requires Node, Git, pnpm, and GitHub CLI (`gh`)
- Backend picker: local JSON, SQLite, GitHub, or Supabase
- Actions: start `dev` / `start`, open Cursor, VS Code, the folder, or a terminal, plus custom commands
- Local trash that moves folders on disk (with a typed confirmation)

## Requirements

- Node.js 22+
- [pnpm](https://pnpm.io)
- [GitHub CLI](https://cli.github.com/) (`gh auth login`) — required to clone, import, and talk to GitHub
- Optional: [Portless](https://github.com/vercel-labs/portless) for `https://projecthub.localhost`
- Optional: Cursor, VS Code, or Codex installed if you want those open buttons

## Install

```bash
git clone https://github.com/YOUR_USER/projecthub.git
cd projecthub
pnpm install
pnpm dev
```

Open [http://127.0.0.1:3456](http://127.0.0.1:3456).

On first launch, a setup screen checks this machine (Node, Git, pnpm, and GitHub CLI, plus optional [Portless](https://github.com/vercel-labs/portless)) and lets you pick a backend.

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

## Project page

Click a card on the studio wall to open `/projects/[id]`. That page is the project home: its idea board, notes, a **Docs** tab for README / PRODUCT / AGENTS, and start/open actions. Give the card a preset or custom color and an emoji or picture icon. The wall stays a kanban of projects.

Each project also has its own Trello-style idea board (Backlog / Doing / Done by default). Add columns, drag cards, set color and labels. This is separate from the studio wall.

GitHub remotes that are not on disk clone with `gh repo clone`. Setup will not continue until GitHub CLI is installed and signed in.

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

## GitHub CLI

ProjectHub never stores a token. `gh` is required to download projects (`gh repo clone`), import your repos, and optionally sync the board.

If you pick the GitHub backend, **Sync** creates or updates a private `projecthub-data` repo and writes `board.json` there. The local store is enough if you prefer JSON or SQLite.

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
