import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { newId, projectIdFromRemote } from "./id";
import { remoteKey } from "./git";
import { readSqliteStore, sqliteExists, writeSqliteStore } from "./sqlite";
import type { CatalogEntry, Column, IdeasBoard, Project, Settings, Store } from "./types";

export const STORE_PATH = join(homedir(), ".projecthub", "store.json");
export const CATALOG_PATH = join(homedir(), ".projecthub", "catalog.json");

const DEFAULT_IGNORE = ["node_modules", ".git", "dist", "target", "build", ".next", "coverage"];

export function defaultSettings(): Settings {
  const home = homedir();
  return {
    scanRoots: [join(home, "Developer"), join(home, "Developer", "zz_cursor")],
    depth: 2,
    ignore: DEFAULT_IGNORE,
    trashPath: join(home, ".projecthub", "trash"),
    cloneRoot: join(home, "Developer"),
    githubToken: "",
    storage: "json",
    setupComplete: false,
  };
}

export function defaultIdeaBoard(): IdeasBoard {
  return {
    columns: [
      { id: "idea-inbox", title: "Ideas", order: 0 },
      { id: "idea-doing", title: "Cooking", order: 1 },
      { id: "idea-done", title: "Done", order: 2 },
    ],
    cards: [],
  };
}

export function defaultColumns(): Column[] {
  return [
    { id: "idea", title: "Idea", order: 0 },
    { id: "en-curso", title: "In progress", order: 1 },
    { id: "pausado", title: "Paused", order: 2 },
    { id: "publicado", title: "Published", order: 3 },
    { id: "archivado", title: "Archived", order: 4 },
  ];
}

function emptyStore(): Store {
  return { version: 1, settings: defaultSettings(), columns: defaultColumns(), projects: [], catalog: [] };
}

function normalizeProject(project: Project): Project {
  return {
    ...project,
    trashed: Boolean(project.trashed),
    trashedAt: project.trashedAt ?? null,
    color: project.color ?? null,
    actions: Array.isArray(project.actions) ? project.actions : [],
    templateId: project.templateId ?? null,
    ideas:
      project.ideas && Array.isArray(project.ideas.columns) && Array.isArray(project.ideas.cards)
        ? project.ideas
        : defaultIdeaBoard(),
  };
}

function normalizeStore(parsed: Partial<Store>): Store {
  const base = emptyStore();
  const settings = { ...base.settings, ...parsed.settings, githubToken: "" };
  if (settings.storage !== "sqlite") settings.storage = "json";
  const hadData =
    (Array.isArray(parsed.projects) && parsed.projects.length > 0) ||
    (Array.isArray(parsed.catalog) && parsed.catalog.length > 0) ||
    Boolean(parsed.settings && Object.keys(parsed.settings).length > 0);
  if (parsed.settings?.setupComplete === undefined && hadData) {
    settings.setupComplete = true;
  }
  return {
    version: 1,
    settings,
    columns: Array.isArray(parsed.columns) && parsed.columns.length > 0 ? parsed.columns : base.columns,
    projects: Array.isArray(parsed.projects) ? parsed.projects.map(normalizeProject) : [],
    catalog: Array.isArray(parsed.catalog) ? parsed.catalog : [],
  };
}

function catalogKey(entry: Pick<CatalogEntry, "id" | "remoteUrl">): string {
  return entry.remoteUrl ? `remote:${remoteKey(entry.remoteUrl) || entry.remoteUrl}` : `id:${entry.id}`;
}

export function syncCatalog(store: Store): void {
  if (!Array.isArray(store.catalog)) store.catalog = [];
  const now = new Date().toISOString();
  const index = new Map<string, number>();
  store.catalog.forEach((entry, i) => {
    index.set(catalogKey(entry), i);
  });

  for (const project of store.projects) {
    const key = project.remoteUrl
      ? `remote:${remoteKey(project.remoteUrl) || project.remoteUrl}`
      : `id:${project.id}`;
    const existingIndex = index.get(key);
    if (existingIndex !== undefined) {
      const prev = store.catalog[existingIndex];
      store.catalog[existingIndex] = {
        ...prev,
        name: project.name || prev.name,
        path: project.path || prev.path,
        remoteUrl: project.remoteUrl || prev.remoteUrl,
        notes: project.notes || prev.notes,
        boardId: project.id,
        missing: Boolean(project.missing),
        trashed: Boolean(project.trashed),
        updatedAt: now,
      };
      continue;
    }
    const entry: CatalogEntry = {
      id: project.remoteUrl ? projectIdFromRemote(remoteKey(project.remoteUrl) || project.remoteUrl) : project.id,
      name: project.name,
      path: project.path,
      remoteUrl: project.remoteUrl,
      notes: project.notes,
      source: "scan",
      boardId: project.id,
      missing: Boolean(project.missing),
      trashed: Boolean(project.trashed),
      updatedAt: now,
    };
    index.set(key, store.catalog.length);
    store.catalog.push(entry);
  }
}

export function publicSettings(settings: Settings) {
  return {
    scanRoots: settings.scanRoots,
    depth: settings.depth,
    ignore: settings.ignore,
    trashPath: settings.trashPath,
    cloneRoot: settings.cloneRoot,
    githubTokenSet: false,
    storage: settings.storage,
    setupComplete: Boolean(settings.setupComplete),
  };
}

function readJsonStore(): Store | null {
  if (!existsSync(STORE_PATH)) return null;
  try {
    const raw = readFileSync(STORE_PATH, "utf8");
    return normalizeStore(JSON.parse(raw) as Partial<Store>);
  } catch {
    return null;
  }
}

export function readStore(): Store {
  const json = readJsonStore();
  const preferSqlite = json?.settings.storage === "sqlite" || (!json && sqliteExists());
  if (preferSqlite && sqliteExists()) {
    const fromDb = readSqliteStore();
    if (fromDb) {
      const store = normalizeStore(fromDb);
      if (json) {
        store.settings = {
          ...store.settings,
          ...json.settings,
          storage: "sqlite",
          githubToken: "",
        };
      }
      return store;
    }
  }
  if (json) return json;
  const store = emptyStore();
  writeStore(store);
  return store;
}

function writeCatalogExport(store: Store): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    cloneRoot: store.settings.cloneRoot,
    projects: store.catalog.map((entry) => ({
      name: entry.name,
      path: entry.path,
      remoteUrl: entry.remoteUrl,
      notes: entry.notes,
      source: entry.source,
      missing: entry.missing,
      trashed: entry.trashed,
    })),
  };
  const tmp = `${CATALOG_PATH}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(payload, null, 2));
  renameSync(tmp, CATALOG_PATH);
}

function writeJsonStore(store: Store): void {
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  const tmp = `${STORE_PATH}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(store, null, 2));
  renameSync(tmp, STORE_PATH);
}

export function writeStore(store: Store): void {
  store.settings.githubToken = "";
  syncCatalog(store);
  writeJsonStore(store);
  writeCatalogExport(store);
  if (store.settings.storage === "sqlite") {
    writeSqliteStore(store);
  }
}

export function initializeSqlite(store = readStore()): Store {
  store.settings.storage = "sqlite";
  writeSqliteStore(store);
  writeStore(store);
  return readStore();
}

export function storeExists(): boolean {
  return existsSync(STORE_PATH) || sqliteExists();
}

export function touchProject(project: Project, patch: Partial<Project>): Project {
  return { ...project, ...patch, updatedAt: new Date().toISOString() };
}

export function ensureColumn(store: Store, columnId: string): string {
  if (store.columns.some((column) => column.id === columnId)) return columnId;
  const first = [...store.columns].sort((a, b) => a.order - b.order)[0];
  return first?.id ?? "idea";
}

export function addColumn(store: Store, title: string): Column {
  const column: Column = {
    id: newId("col"),
    title: title.trim() || "New column",
    order: store.columns.reduce((max, column) => Math.max(max, column.order), -1) + 1,
  };
  store.columns.push(column);
  return column;
}
