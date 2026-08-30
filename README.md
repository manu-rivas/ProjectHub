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
- Per-project idea board
- Actions: start `dev` / `start`, open Cursor, VS Code, the folder, or a terminal, plus custom commands
- Optional SQLite database, initialized from the UI
- Optional private GitHub backend (`your-user/projecthub-data`) via `gh`
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

On first launch, a setup wizard asks for scan roots, a clone destination, and whether to initialize SQLite or the GitHub backend.

macOS: double-click `Arrancar ProjectHub.command` (kept for existing users) or `Start ProjectHub.command`.

## Data

| Path | Role |
| --- | --- |
| `~/.projecthub/store.json` | Always written. Safe backup and the default backend. |
| `~/.projecthub/catalog.json` | Export of the catalog |
| `~/.projecthub/hub.db` | Optional SQLite copy, created from Settings or first-run setup |
| `~/.projecthub/sync/` | Local clone of the optional `projecthub-data` GitHub repo |

Existing boards keep working. Initializing SQLite copies the current store; it does not delete JSON. Column titles you already renamed stay as they are.

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
