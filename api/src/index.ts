import { resolve, join, normalize } from "node:path";
import {
  createEvent,
  eventExists,
  getEvent,
  upsertAvailability,
  deleteAvailability,
  safeParse,
} from "./db.ts";

const PORT = Number(process.env.PORT ?? 3001);
const DIST_DIR = resolve(process.env.STATIC_DIR ?? "./public");
const INDEX_HTML = join(DIST_DIR, "index.html");
const DIST_DIR_EXISTS = await Bun.file(INDEX_HTML).exists();

// Topic string mirrors /web/src/lib/ws.ts wsTopicFor().
const wsTopicFor = (eventId: string) => "event:" + eventId;

const server = Bun.serve({
  port: PORT,

  routes: {
    "/api/events": {
      POST: async (req) => {
        const body = await safeJson(req);
        const parsed = parseNameAndStringArray(body, "dates");
        if (!parsed) {
          return Response.json({ error: "missing name or dates" }, { status: 400 });
        }
        const id = createEvent(parsed.name, parsed.values);
        return Response.json({ id });
      },
    },

    "/api/events/:id": {
      GET: (req) => {
        const event = getEvent(req.params.id);
        if (!event) return Response.json({ error: "not found" }, { status: 404 });
        return Response.json(event);
      },
    },

    "/api/events/:id/availability": {
      POST: async (req) => {
        const eventId = req.params.id;
        const body = await safeJson(req);
        const parsed = parseNameAndStringArray(body, "slots");
        if (!parsed) {
          return Response.json({ error: "missing name or slots" }, { status: 400 });
        }

        if (!eventExists(eventId)) {
          return Response.json({ error: "not found" }, { status: 404 });
        }

        upsertAvailability(eventId, parsed.name, parsed.values);
        publishEvent(eventId);
        return Response.json({ ok: true });
      },
    },

    "/api/events/:id/availability/:name": {
      DELETE: (req) => {
        const eventId = req.params.id;
        const name = decodeURIComponent(req.params.name);

        if (!eventExists(eventId)) {
          return Response.json({ error: "not found" }, { status: 404 });
        }

        deleteAvailability(eventId, name);
        publishEvent(eventId);
        return Response.json({ ok: true });
      },
    },

    "/ws": (req, server) => {
      if (server.upgrade(req)) {
        return undefined as unknown as Response;
      }
      return new Response("websocket upgrade failed", { status: 400 });
    },
  },

  async fetch(req) {
    if (!DIST_DIR_EXISTS) {
      return new Response("not found", { status: 404 });
    }

    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/") || url.pathname === "/ws") {
      return new Response("not found", { status: 404 });
    }

    // Resolve the requested path against DIST_DIR, guarding path traversal.
    const requested = normalize(join(DIST_DIR, decodeURIComponent(url.pathname)));
    if (requested.startsWith(DIST_DIR) && requested !== DIST_DIR) {
      const file = Bun.file(requested);
      if (await file.exists()) {
        return new Response(file);
      }
    }

    // SPA fallback
    return new Response(Bun.file(INDEX_HTML), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  },

  websocket: {
    open(ws) {
      void ws;
    },
    message(ws, message) {
      const raw = typeof message === "string" ? message : message.toString();
      const msg = safeParse<{ type?: string; eventId?: string } | null>(raw, null);
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "subscribe" && typeof msg.eventId === "string") {
        ws.subscribe(wsTopicFor(msg.eventId));
        const event = getEvent(msg.eventId);
        if (event) {
          ws.send(JSON.stringify({ type: "event", event }));
        }
        return;
      }

      if (msg.type === "unsubscribe" && typeof msg.eventId === "string") {
        ws.unsubscribe(wsTopicFor(msg.eventId));
        return;
      }
    },
    close() {
      // Bun cleans up subscriptions automatically
    },
  },
});

function publishEvent(id: string) {
  const event = getEvent(id);
  if (!event) return;
  server.publish(
    wsTopicFor(id),
    JSON.stringify({ type: "event", event }),
  );
}

async function safeJson(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

function parseNameAndStringArray(
  body: unknown,
  arrKey: string,
): { name: string; values: string[] } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const arr = b[arrKey];
  if (!name || !Array.isArray(arr)) return null;
  if (!arr.every((v) => typeof v === "string")) return null;
  return { name, values: arr as string[] };
}

console.log(`when2meet-api listening on http://localhost:${server.port}`);
