// Pure, dependency-free SQL guard helpers for the analyst agent.
// Deliberately import-free so they are trivial to unit test in isolation.

export type GuardResult = { ok: true } | { ok: false; reason: string };

const WRITE_KEYWORDS = [
  "insert",
  "update",
  "delete",
  "drop",
  "alter",
  "create",
  "replace",
  "truncate",
  "attach",
  "detach",
  "pragma",
  "vacuum",
  "reindex",
  "grant",
  "revoke",
];

/** Remove comments, trim, and drop a single trailing semicolon. */
export function stripSql(sql: string): string {
  const noBlock = sql.replace(/\/\*[\s\S]*?\*\//g, " ");
  const noLine = noBlock.replace(/--[^\n]*/g, " ");
  return noLine.trim().replace(/;\s*$/, "").trim();
}

/** True only for a single read-only SELECT (or WITH...SELECT) statement. */
export function isReadOnlySelect(sqlRaw: string): GuardResult {
  const sql = stripSql(sqlRaw);
  if (sql.length === 0) return { ok: false, reason: "Empty query." };
  if (sql.includes(";")) {
    return { ok: false, reason: "Only a single statement is allowed." };
  }
  const lower = sql.toLowerCase();
  const firstWord = lower.split(/\s+/)[0] ?? "";
  if (firstWord !== "select" && firstWord !== "with") {
    return {
      ok: false,
      reason: `Only read-only SELECT queries are allowed (got "${firstWord}").`,
    };
  }
  for (const kw of WRITE_KEYWORDS) {
    if (new RegExp(`\\b${kw}\\b`, "i").test(lower)) {
      return { ok: false, reason: `Query contains a disallowed keyword: ${kw.toUpperCase()}.` };
    }
  }
  return { ok: true };
}

/**
 * Heuristic for a query a human should confirm before it runs: an unbounded
 * full-table scan (no WHERE and no LIMIT) or a comma cartesian join with no WHERE.
 */
export function looksExpensive(sqlRaw: string): boolean {
  const sql = stripSql(sqlRaw).toLowerCase();
  const hasLimit = /\blimit\s+\d+/.test(sql);
  const hasWhere = /\bwhere\b/.test(sql);
  const commaJoin = /\bfrom\b[^;]*,[^;]*/.test(sql) && !hasWhere;
  if (commaJoin) return true;
  if (!hasWhere && !hasLimit) return true;
  return false;
}
