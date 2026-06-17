import express from "express";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(join(__dirname, "public")));

// --- Menue laden (bei jedem Aufruf frisch, damit Aenderungen sofort wirken) ---
async function loadMenu() {
  const raw = await readFile(join(__dirname, "menu.json"), "utf8");
  return JSON.parse(raw);
}

// --- In-Memory Bestell-Speicher ---
// Hinweis: Bestellungen liegen nur im Arbeitsspeicher. Bei einem Server-Neustart
// sind offene Bestellungen weg. Fuer einen Live-Betrieb voellig ausreichend,
// da Bestellungen kurzlebig sind. Persistenz koennte spaeter ergaenzt werden.
let orders = [];
let nextId = 1;

// --- Server-Sent-Events: verbundene Dashboards ---
const clients = new Set();

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    res.write(payload);
  }
}

// --- API ---

app.get("/api/menu", async (_req, res) => {
  try {
    res.json(await loadMenu());
  } catch (err) {
    res.status(500).json({ error: "Menue konnte nicht geladen werden." });
  }
});

// Neue Bestellung anlegen
app.post("/api/orders", async (req, res) => {
  const { table, items } = req.body || {};

  if (!table || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Tisch und mindestens ein Artikel sind erforderlich." });
  }

  const menu = await loadMenu();
  const lookup = new Map([...menu.drinks, ...menu.food].map((i) => [i.id, i]));

  // Server-seitige Validierung + Preisberechnung (nie dem Client vertrauen)
  const validated = [];
  for (const it of items) {
    const ref = lookup.get(it.id);
    const qty = Math.max(1, Math.min(50, parseInt(it.qty, 10) || 0));
    if (ref && qty > 0) {
      validated.push({ id: ref.id, name: ref.name, price: ref.price, qty });
    }
  }
  if (validated.length === 0) {
    return res.status(400).json({ error: "Keine gueltigen Artikel in der Bestellung." });
  }

  const total = validated.reduce((sum, i) => {
    const price = typeof i.price === "number" ? i.price : 0;
    return sum + price * i.qty;
  }, 0);

  const order = {
    id: nextId++,
    table: String(table).slice(0, 20),
    items: validated,
    total: Math.round(total * 100) / 100,
    note: typeof req.body.note === "string" ? req.body.note.slice(0, 300) : "",
    status: "open",
    createdAt: new Date().toISOString(),
  };

  orders.push(order);
  broadcast("order", order);
  res.status(201).json({ ok: true, orderId: order.id });
});

// Bestellung als erledigt markieren
app.post("/api/orders/:id/done", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const order = orders.find((o) => o.id === id);
  if (!order) return res.status(404).json({ error: "Bestellung nicht gefunden." });
  order.status = "done";
  broadcast("done", { id });
  res.json({ ok: true });
});

// Live-Stream fuer das Dashboard (Server-Sent Events)
app.get("/api/stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write("retry: 3000\n\n");

  // Bestehende offene Bestellungen sofort nachliefern
  for (const o of orders.filter((o) => o.status === "open")) {
    res.write(`event: order\ndata: ${JSON.stringify(o)}\n\n`);
  }

  clients.add(res);

  // Heartbeat, damit Proxys die Verbindung nicht kappen
  const ping = setInterval(() => res.write(": ping\n\n"), 25000);

  req.on("close", () => {
    clearInterval(ping);
    clients.delete(res);
  });
});

app.listen(PORT, () => {
  console.log(`QR-Bestellung laeuft auf Port ${PORT}`);
});
