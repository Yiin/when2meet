import { nanoid } from "nanoid";
import db from "./db";
import index from "../static/index.html";

const getEvent = db.prepare("SELECT * FROM events WHERE id = ?");
const getAvailability = db.prepare("SELECT participant_name, slots FROM availability WHERE event_id = ?");
const insertEvent = db.prepare(
  "INSERT INTO events (id, name, dates) VALUES (?, ?, ?)"
);
const upsertAvailability = db.prepare(
  `INSERT INTO availability (event_id, participant_name, slots, updated_at)
   VALUES (?, ?, ?, datetime('now'))
   ON CONFLICT(event_id, participant_name) DO UPDATE SET slots = excluded.slots, updated_at = excluded.updated_at`
);
const deleteAvailability = db.prepare(
  "DELETE FROM availability WHERE event_id = ? AND participant_name = ?"
);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function eventResponse(event: any) {
  const availability = getAvailability.all(event.id) as any[];
  return json({
    ...event,
    dates: JSON.parse(event.dates),
    participants: availability.map((a: any) => ({
      name: a.participant_name,
      slots: JSON.parse(a.slots),
    })),
  });
}

Bun.serve({
  port: Number(process.env.PORT) || 3000,
  routes: {
    "/api/events": {
      POST: async (req) => {
        const body = await req.json();
        const { name, dates } = body;
        if (!name || !dates?.length) {
          return json({ error: "Missing required fields" }, 400);
        }
        const id = nanoid(10);
        insertEvent.run(id, name, JSON.stringify(dates));
        return json({ id });
      },
    },
    "/api/events/:id": {
      GET: (req) => {
        const event = getEvent.get(req.params.id) as any;
        if (!event) return json({ error: "Event not found" }, 404);
        return eventResponse(event);
      },
    },
    "/api/events/:id/availability": {
      POST: async (req) => {
        const eventId = req.params.id;
        const { name, slots } = await req.json();
        if (!name || !slots) return json({ error: "Missing name or slots" }, 400);
        const event = getEvent.get(eventId);
        if (!event) return json({ error: "Event not found" }, 404);
        upsertAvailability.run(eventId, name, JSON.stringify(slots));
        return json({ ok: true });
      },
    },
    "/api/events/:id/availability/:name": {
      DELETE: (req) => {
        const eventId = req.params.id;
        const name = decodeURIComponent(req.params.name);
        deleteAvailability.run(eventId, name);
        return json({ ok: true });
      },
    },
    "/*": index,
  },
});

console.log("when2meet running on :3000");
