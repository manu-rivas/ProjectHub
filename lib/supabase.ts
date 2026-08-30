import type { Store } from "./types";
import { readSecrets, supabaseConfigured } from "./secrets";

const TABLE = "projecthub_store";

export class SupabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseError";
  }
}

function restUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, "")}/rest/v1/${path}`;
}

async function request(path: string, init: RequestInit): Promise<Response> {
  const secrets = readSecrets();
  if (!supabaseConfigured(secrets)) {
    throw new SupabaseError("Add your Supabase URL and service role key in setup");
  }
  const headers = new Headers(init.headers);
  headers.set("apikey", secrets.supabaseKey);
  headers.set("Authorization", `Bearer ${secrets.supabaseKey}`);
  headers.set("Content-Type", "application/json");
  return fetch(restUrl(secrets.supabaseUrl, path), { ...init, headers });
}

export function supabaseBootstrapSql(): string {
  return `create table if not exists ${TABLE} (
  id int primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table ${TABLE} enable row level security;
`;
}

export async function writeSupabaseStore(store: Store): Promise<void> {
  const payload = [{ id: 1, data: store, updated_at: new Date().toISOString() }];
  const response = await request(`${TABLE}?on_conflict=id`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    if (response.status === 404 || /could not find the table/i.test(text)) {
      throw new SupabaseError(
        `Create the ${TABLE} table in the Supabase SQL editor, then try again. ProjectHub still keeps your local JSON.`,
      );
    }
    throw new SupabaseError(text.slice(0, 280) || "Supabase write failed");
  }
}

export async function readSupabaseStore(): Promise<Store | null> {
  const response = await request(`${TABLE}?id=eq.1&select=data`, { method: "GET" });
  if (!response.ok) {
    if (response.status === 404) return null;
    const text = await response.text();
    throw new SupabaseError(text.slice(0, 280) || "Supabase read failed");
  }
  const rows = (await response.json()) as { data?: Store }[];
  const data = rows[0]?.data;
  if (!data?.settings || !Array.isArray(data.projects)) return null;
  return data;
}

export async function supabaseStatus(): Promise<{
  configured: boolean;
  reachable: boolean;
  tableReady: boolean;
  projects: number;
  error?: string;
}> {
  if (!supabaseConfigured()) {
    return { configured: false, reachable: false, tableReady: false, projects: 0 };
  }
  try {
    const response = await request(`${TABLE}?id=eq.1&select=id`, { method: "GET" });
    if (response.ok) {
      const store = await readSupabaseStore();
      return {
        configured: true,
        reachable: true,
        tableReady: true,
        projects: store?.projects.length || 0,
      };
    }
    const text = await response.text();
    return {
      configured: true,
      reachable: response.status !== 401 && response.status !== 403,
      tableReady: false,
      projects: 0,
      error: text.slice(0, 200) || `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      configured: true,
      reachable: false,
      tableReady: false,
      projects: 0,
      error: error instanceof Error ? error.message : "Could not reach Supabase",
    };
  }
}
