import Database from "better-sqlite3";
import path from "path";
import { runMigrations } from "./migrations";

const DB_PATH =
  process.env.DATABASE_PATH ||
  path.join(process.cwd(), "data", "gira.db");

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
}

function createDb(): Database.Database {
  const db = new Database(DB_PATH);

  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("synchronous = NORMAL");
  db.pragma("cache_size = -20000");
  db.pragma("foreign_keys = ON");
  db.pragma("temp_store = MEMORY");

  runMigrations(db);
  return db;
}

export const db: Database.Database =
  globalThis.__db ?? (globalThis.__db = createDb());

if (process.env.NODE_ENV === "development") {
  globalThis.__db = db;
}
