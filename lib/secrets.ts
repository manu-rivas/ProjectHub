import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const SECRETS_PATH = join(homedir(), ".projecthub", "secrets.json");

export type Secrets = {
  supabaseUrl: string;
  supabaseKey: string;
};

function emptySecrets(): Secrets {
  return { supabaseUrl: "", supabaseKey: "" };
}

export function readSecrets(): Secrets {
  try {
    const parsed = JSON.parse(readFileSync(SECRETS_PATH, "utf8")) as Partial<Secrets>;
    return {
      supabaseUrl: parsed.supabaseUrl?.trim() || "",
      supabaseKey: parsed.supabaseKey?.trim() || "",
    };
  } catch {
    return emptySecrets();
  }
}

export function writeSecrets(patch: Partial<Secrets>): Secrets {
  const next = { ...readSecrets(), ...patch };
  mkdirSync(dirname(SECRETS_PATH), { recursive: true });
  const tmp = `${SECRETS_PATH}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(next, null, 2));
  renameSync(tmp, SECRETS_PATH);
  return next;
}

export function secretsExist(): boolean {
  return existsSync(SECRETS_PATH);
}

export function supabaseConfigured(secrets = readSecrets()): boolean {
  return Boolean(secrets.supabaseUrl && secrets.supabaseKey);
}
