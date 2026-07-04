import { test } from "node:test";
import assert from "node:assert/strict";
import { getDb, listTables, tableNames } from "../agent/lib/db.ts";

test("exposes the five expected tables", () => {
  assert.deepEqual([...tableNames()].sort(), [
    "customers",
    "order_items",
    "orders",
    "products",
    "refunds",
  ]);
});

test("seeds exactly 14 customers, 2 of them test accounts", () => {
  const db = getDb();
  const total = (db.prepare("SELECT COUNT(*) AS n FROM customers").get() as { n: number }).n;
  const tests = (db.prepare("SELECT COUNT(*) AS n FROM customers WHERE is_test = 1").get() as { n: number }).n;
  assert.equal(total, 14);
  assert.equal(tests, 2);
});

test("seeds 10 products", () => {
  const db = getDb();
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM products").get() as { n: number }).n, 10);
});

test("listTables row counts match direct counts", () => {
  const db = getDb();
  for (const { name, rows } of listTables()) {
    const direct = (db.prepare(`SELECT COUNT(*) AS n FROM ${name}`).get() as { n: number }).n;
    assert.equal(rows, direct, `row count mismatch for ${name}`);
  }
});

test("net revenue (excl. test accounts, minus refunds) is positive and <= gross", () => {
  const db = getDb();
  const gross = (
    db
      .prepare(
        `SELECT COALESCE(SUM(oi.qty * oi.unit_price_cents), 0) AS c
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         JOIN customers c ON c.id = o.customer_id
         WHERE o.status IN ('paid','fulfilled') AND c.is_test = 0`,
      )
      .get() as { c: number }
  ).c;

  const refunds = (
    db
      .prepare(
        `SELECT COALESCE(SUM(r.amount_cents), 0) AS c
         FROM refunds r
         JOIN orders o ON o.id = r.order_id
         JOIN customers c ON c.id = o.customer_id
         WHERE c.is_test = 0`,
      )
      .get() as { c: number }
  ).c;

  const net = gross - refunds;
  assert.ok(gross > 0, "gross should be positive");
  assert.ok(net > 0, "net should be positive");
  assert.ok(net <= gross, "net should not exceed gross");
});

test("the most recent week has fewer orders than the prior week (a real dip)", () => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT ordered_at FROM orders ORDER BY ordered_at DESC`,
    )
    .all() as { ordered_at: string }[];
  const maxDate = new Date(rows[0]!.ordered_at).getTime();
  const day = 86_400_000;
  const inWindow = (from: number, to: number) =>
    rows.filter((r) => {
      const t = new Date(r.ordered_at).getTime();
      return t > maxDate - from * day && t <= maxDate - to * day;
    }).length;
  const lastWeek = inWindow(7, 0);
  const priorWeek = inWindow(14, 7);
  assert.ok(lastWeek < priorWeek, `expected dip: lastWeek=${lastWeek} priorWeek=${priorWeek}`);
});
