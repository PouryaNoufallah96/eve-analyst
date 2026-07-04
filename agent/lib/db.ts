// A tiny, fully deterministic e-commerce warehouse seeded into an in-memory
// SQLite database using node:sqlite (built into Node 24, zero dependencies).
//
// It is seeded once per process and never touches the filesystem, so it behaves
// identically on a laptop and on a read-only serverless filesystem (Vercel).

import { DatabaseSync } from "node:sqlite";

export const TABLES = ["customers", "products", "orders", "order_items", "refunds"] as const;
export type TableName = (typeof TABLES)[number];

const CATEGORIES = ["Widgets", "Gadgets", "Gizmos", "Accessories"];
const DAY = 86_400_000;
const BASE = Date.parse("2026-06-29T00:00:00Z"); // a Monday; the end of the data window

let _db: DatabaseSync | null = null;

/** Deterministic PRNG (mulberry32) so the dataset is identical on every run. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function iso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function seed(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE customers (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      country TEXT NOT NULL,
      is_test INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price_cents INTEGER NOT NULL
    );
    CREATE TABLE orders (
      id INTEGER PRIMARY KEY,
      customer_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      ordered_at TEXT NOT NULL
    );
    CREATE TABLE order_items (
      id INTEGER PRIMARY KEY,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      qty INTEGER NOT NULL,
      unit_price_cents INTEGER NOT NULL
    );
    CREATE TABLE refunds (
      id INTEGER PRIMARY KEY,
      order_id INTEGER NOT NULL,
      amount_cents INTEGER NOT NULL,
      reason TEXT NOT NULL,
      refunded_at TEXT NOT NULL
    );
  `);

  // 14 customers; ids 11 and 12 are internal/test accounts (example.com).
  const names = [
    "Ava Chen", "Ben Ortiz", "Cara Singh", "Dan Meyer", "Ella Park", "Finn Wu",
    "Gina Rossi", "Hugo Blanc", "Ivy Novak", "Jae Kim", "Test Account", "QA Bot",
    "Kai Larsson", "Mona Diaz",
  ];
  const countries = ["US","US","US","CA","GB","DE","US","AU","US","FR","US","CA","US","GB"];
  const insCust = db.prepare(
    "INSERT INTO customers (id,name,email,country,is_test,created_at) VALUES (?,?,?,?,?,?)",
  );
  for (let i = 0; i < names.length; i++) {
    const isTest = names[i] === "Test Account" || names[i] === "QA Bot" ? 1 : 0;
    const slug = names[i]!.toLowerCase().replace(/[^a-z]+/g, ".");
    const email = isTest ? `${slug}@example.com` : `${slug}@mail.com`;
    insCust.run(i + 1, names[i]!, email, countries[i]!, isTest, iso(BASE - (200 + i * 7) * DAY));
  }

  // 10 products: [name, categoryIndex, priceCents].
  const products: [string, number, number][] = [
    ["Nimbus Mug", 0, 1800],
    ["Bolt Charger", 1, 3500],
    ["Pixel Lamp", 2, 4200],
    ["Cloud Keyboard", 1, 8900],
    ["Fable Notebook", 3, 1200],
    ["Vector Mouse", 1, 4900],
    ["Aero Bottle", 3, 2500],
    ["Loop Cable", 3, 900],
    ["Quartz Watch", 2, 15900],
    ["Drift Speaker", 0, 6900],
  ];
  const insProd = db.prepare("INSERT INTO products (id,name,category,price_cents) VALUES (?,?,?,?)");
  products.forEach((p, i) => insProd.run(i + 1, p[0], CATEGORIES[p[1]]!, p[2]));
  const priceOf = products.map((p) => p[2]);

  const rand = rng(1_234_567);
  const insOrder = db.prepare("INSERT INTO orders (id,customer_id,status,ordered_at) VALUES (?,?,?,?)");
  const insItem = db.prepare(
    "INSERT INTO order_items (id,order_id,product_id,qty,unit_price_cents) VALUES (?,?,?,?,?)",
  );
  const insRefund = db.prepare(
    "INSERT INTO refunds (id,order_id,amount_cents,reason,refunded_at) VALUES (?,?,?,?,?)",
  );

  // Orders across 8 weeks. Index 7 is the most recent week and dips on purpose,
  // so the investigator subagent has a real drop to explain.
  const perWeek = [12, 13, 11, 14, 12, 13, 15, 6];
  let orderId = 0;
  let itemId = 0;
  let refundId = 0;
  for (let w = 0; w < perWeek.length; w++) {
    for (let k = 0; k < perWeek[w]!; k++) {
      orderId++;
      let cust = 1 + Math.floor(rand() * 14);
      if ((cust === 11 || cust === 12) && rand() < 0.7) {
        cust = 1 + Math.floor(rand() * 10); // usually reroute a test-account order to a real customer
      }
      const dayOffset = (7 - w) * 7 + Math.floor(rand() * 7);
      const orderedAt = iso(BASE - dayOffset * DAY);
      const roll = rand();
      const status = roll < 0.08 ? "cancelled" : roll < 0.5 ? "paid" : "fulfilled";
      insOrder.run(orderId, cust, status, orderedAt);

      const itemCount = 1 + Math.floor(rand() * 3);
      for (let it = 0; it < itemCount; it++) {
        itemId++;
        const pid = 1 + Math.floor(rand() * 10);
        const qty = 1 + Math.floor(rand() * 3);
        insItem.run(itemId, orderId, pid, qty, priceOf[pid - 1]!);
      }

      if (status !== "cancelled" && rand() < 0.1) {
        refundId++;
        insRefund.run(refundId, orderId, 500 + Math.floor(rand() * 2000), "customer request", orderedAt);
      }
    }
  }
}

export function getDb(): DatabaseSync {
  if (_db) return _db;
  const db = new DatabaseSync(":memory:");
  seed(db);
  _db = db;
  return db;
}

export function tableNames(): string[] {
  return [...TABLES];
}

export function listTables(): { name: string; rows: number }[] {
  const db = getDb();
  return TABLES.map((name) => {
    const row = db.prepare(`SELECT COUNT(*) AS n FROM ${name}`).get() as { n: number };
    return { name, rows: row.n };
  });
}

export function describeTable(name: string): { name: string; type: string }[] {
  if (!TABLES.includes(name as TableName)) return [];
  const db = getDb();
  const cols = db.prepare(`PRAGMA table_info(${name})`).all() as { name: string; type: string }[];
  return cols.map((c) => ({ name: c.name, type: c.type }));
}
