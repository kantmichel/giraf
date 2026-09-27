import Database from "better-sqlite3";
import path from "path";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { runMigrations } from "./migrations";

// `next build` collects page data with a worker per core, and every worker
// imports this module. Nothing is read from the database at build time, so each
// gets a throwaway in-memory one instead of racing the others over the real
// file — which, in a local checkout, is your dev database. Decided here so it
// holds for a local build, CI and the Docker image alike.
const DB_PATH =
  process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD
    ? ":memory:"
    : process.env.DATABASE_PATH || path.join(process.cwd(), "data", "gira.db");

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
}

const BUSY_TIMEOUT_MS = 5000;

/**
 * busy_timeout does not cover the switch to WAL: when another process has the
 * file open mid-switch it fails with SQLITE_BUSY at once (reproduced with 11
 * processes on one fresh file, 8 runs in 100). So it is retried for as long as
 * busy_timeout would have waited. The mode is persistent — whichever process
 * gets it through first switches the file for everyone.
 */
function enableWal(db: Database.Database): void {
  const deadline = Date.now() + BUSY_TIMEOUT_MS;
  const pause = new Int32Array(new SharedArrayBuffer(4));
  for (;;) {
    try {
      db.pragma("journal_mode = WAL");
      return;
    } catch (error) {
      const busy = String((error as { code?: unknown }).code).startsWith("SQLITE_BUSY");
      if (!busy || Date.now() > deadline) throw error;
      Atomics.wait(pause, 0, 0, 10);
    }
  }
}

function createDb(): Database.Database {
  const db = new Database(DB_PATH);

  // First, so migrating and every later write waits for another process's
  // lock instead of failing with "database is locked".
  db.pragma(`busy_timeout = ${BUSY_TIMEOUT_MS}`);
  enableWal(db);
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
