import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { CatalogEntry, Column, Project, Settings, Store } from "./types";

export const DB_PATH = join(homedir(), ".projecthub", "hub.db");

type SnapshotRow = { data: string };

function openDb(create = false): DatabaseSync {
  if (!create && !existsSync(DB_PATH)) {
    throw new Error("SQLite database is not initialized");
  }
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS snapshot (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return db;
}

export function sqliteExists(): boolean {
  return existsSync(DB_PATH);
}

export function writeSqliteStore(store: Store): void {
  const db = openDb(true);
  try {
    const payload = JSON.stringify(store);
    db.prepare(
      "INSERT INTO snapshot (id, data, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
    ).run(payload, new Date().toISOString());
  } finally {
    db.close();
  }
}

export function readSqliteStore(): Store | null {
  if (!existsSync(DB_PATH)) return null;
  const db = openDb(false);
  try {
    const row = db.prepare("SELECT data FROM snapshot WHERE id = 1").get() as SnapshotRow | undefined;
    if (!row?.data) return null;
    const parsed = JSON.parse(row.data) as Partial<Store>;
    if (!parsed.settings || !Array.isArray(parsed.projects)) return null;
    return parsed as Store;
  } catch {
    return null;
  } finally {
    db.close();
  }
}

export function sqliteStatus(): {
  exists: boolean;
  path: string;
  columns: number;
  projects: number;
  catalog: number;
} {
  const empty = { exists: false, path: DB_PATH, columns: 0, projects: 0, catalog: 0 };
  if (!existsSync(DB_PATH)) return empty;
  const store = readSqliteStore();
  if (!store) return { ...empty, exists: true };
  return {
    exists: true,
    path: DB_PATH,
    columns: store.columns.length,
    projects: store.projects.length,
    catalog: store.catalog.length,
  };
}

export function importStoreShape(store: Store): {
  settings: Settings;
  columns: Column[];
  projects: Project[];
  catalog: CatalogEntry[];
} {
  return {
    settings: store.settings,
    columns: store.columns,
    projects: store.projects,
    catalog: store.catalog,
  };
}
