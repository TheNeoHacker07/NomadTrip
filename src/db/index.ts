import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as schema from "./schema";

export function createDb(path: string) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return drizzle({ client: sqlite, schema });
}

export type Db = ReturnType<typeof createDb>;

// Reuse one connection across hot reloads in dev.
const globalForDb = globalThis as unknown as { nomadDb?: Db };
export const db = (globalForDb.nomadDb ??= createDb(process.env.DATABASE_PATH ?? "data/nomadtrip.db"));
