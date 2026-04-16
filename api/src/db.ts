import { Database } from "bun:sqlite";
import { join } from "node:path";
import { nanoid } from "nanoid";

const DB_PATH =
  process.env.DB_PATH ?? join(import.meta.dir, "..", "..", "data", "when2meet.db");

export const db = new Database(DB_PATH, { create: true });

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    dates TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_name TEXT NOT NULL,
    slots TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(event_id, participant_name)
  );
`);

const insertEventStmt = db.prepare<
  void,
  { $id: string; $name: string; $dates: string }
>(
  "INSERT INTO events (id, name, dates) VALUES ($id, $name, $dates)",
);

const getEventRowStmt = db.prepare<
  { id: string; name: string; dates: string; created_at: string },
  { $id: string }
>(
  "SELECT id, name, dates, created_at FROM events WHERE id = $id",
);

const eventExistsStmt = db.prepare<{ "1": number }, { $id: string }>(
  "SELECT 1 FROM events WHERE id = $id",
);

const getParticipantsStmt = db.prepare<
  { participant_name: string; slots: string },
  { $id: string }
>(
  "SELECT participant_name, slots FROM availability WHERE event_id = $id ORDER BY updated_at ASC",
);

const upsertAvailabilityStmt = db.prepare<
  void,
  { $event_id: string; $name: string; $slots: string }
>(
  `INSERT INTO availability (event_id, participant_name, slots, updated_at)
   VALUES ($event_id, $name, $slots, datetime('now'))
   ON CONFLICT(event_id, participant_name)
   DO UPDATE SET slots = excluded.slots, updated_at = datetime('now')`,
);

const deleteAvailabilityStmt = db.prepare<
  void,
  { $event_id: string; $name: string }
>(
  "DELETE FROM availability WHERE event_id = $event_id AND participant_name = $name",
);

// Mirrors /web/src/types.ts EventData (plus created_at). Kept in sync by hand;
// /api and /web are separate packages, so no cross-import.
export type EventRecord = {
  id: string;
  name: string;
  dates: string[];
  participants: { name: string; slots: string[] }[];
  created_at: string;
};

export function createEvent(name: string, dates: string[]): string {
  const id = nanoid(10);
  insertEventStmt.run({
    $id: id,
    $name: name,
    $dates: JSON.stringify(dates),
  });
  return id;
}

export function eventExists(id: string): boolean {
  return eventExistsStmt.get({ $id: id }) !== null;
}

export function getEvent(id: string): EventRecord | null {
  const row = getEventRowStmt.get({ $id: id });
  if (!row) return null;

  const parts = getParticipantsStmt.all({ $id: id });
  const participants = parts.map((p) => ({
    name: p.participant_name,
    slots: safeParse<string[]>(p.slots, []),
  }));

  return {
    id: row.id,
    name: row.name,
    dates: safeParse<string[]>(row.dates, []),
    participants,
    created_at: row.created_at,
  };
}

export function upsertAvailability(
  eventId: string,
  name: string,
  slots: string[],
): void {
  upsertAvailabilityStmt.run({
    $event_id: eventId,
    $name: name,
    $slots: JSON.stringify(slots),
  });
}

export function deleteAvailability(eventId: string, name: string): void {
  deleteAvailabilityStmt.run({
    $event_id: eventId,
    $name: name,
  });
}

export function safeParse<T>(s: string, fallback: T): T {
  try {
    const v = JSON.parse(s);
    if (Array.isArray(fallback)) {
      return Array.isArray(v) ? (v as T) : fallback;
    }
    return v as T;
  } catch {
    return fallback;
  }
}
