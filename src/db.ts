import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";
import { join, dirname } from "path";

const dbPath = process.env.DB_PATH || join(import.meta.dir, "..", "data", "when2meet.db");
mkdirSync(dirname(dbPath), { recursive: true });

const db = new Database(dbPath, { create: true });
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    dates TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_name TEXT NOT NULL,
    slots TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(event_id, participant_name)
  );
`);

for (const col of ["time_start", "time_end", "timezone"]) {
  try { db.exec(`ALTER TABLE events DROP COLUMN ${col}`); } catch {}
}

export default db;
