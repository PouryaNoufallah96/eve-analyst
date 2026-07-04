import { test } from "node:test";
import assert from "node:assert/strict";
import { isReadOnlySelect, looksExpensive, stripSql } from "../agent/lib/sql-guard.ts";

test("allows a simple bounded SELECT", () => {
  assert.equal(isReadOnlySelect("SELECT * FROM customers WHERE id = 1").ok, true);
});

test("allows a WITH ... SELECT (CTE)", () => {
  assert.equal(isReadOnlySelect("WITH x AS (SELECT 1 AS a) SELECT a FROM x").ok, true);
});

test("rejects writes and DDL", () => {
  for (const q of [
    "INSERT INTO t VALUES (1)",
    "UPDATE t SET a = 1",
    "DELETE FROM t",
    "DROP TABLE t",
    "ALTER TABLE t ADD COLUMN c INT",
    "CREATE TABLE t (a INT)",
    "PRAGMA table_info(t)",
  ]) {
    assert.equal(isReadOnlySelect(q).ok, false, `should reject: ${q}`);
  }
});

test("rejects multiple statements", () => {
  assert.equal(isReadOnlySelect("SELECT 1; SELECT 2").ok, false);
});

test("rejects a write hidden after a comment", () => {
  assert.equal(isReadOnlySelect("SELECT 1 -- ok\n; DELETE FROM t").ok, false);
});

test("rejects an empty query", () => {
  assert.equal(isReadOnlySelect("   ").ok, false);
});

test("stripSql removes comments and a trailing semicolon", () => {
  assert.equal(stripSql("SELECT 1 /* c */ -- x\n;"), "SELECT 1");
});

test("flags an unbounded full scan as expensive", () => {
  assert.equal(looksExpensive("SELECT * FROM order_items"), true);
  assert.equal(looksExpensive("SELECT a, b FROM orders, customers"), true);
});

test("does not flag a bounded query as expensive", () => {
  assert.equal(looksExpensive("SELECT * FROM order_items WHERE order_id = 5"), false);
  assert.equal(looksExpensive("SELECT * FROM order_items LIMIT 10"), false);
});
