// Shared read-only query execution used by both the primary agent's run_sql
// (which adds a human approval gate) and the investigator subagent's run_sql
// (which runs autonomously). Read-only enforcement lives here, so it applies
// to every caller regardless of approval policy.

import { isReadOnlySelect } from "./sql-guard.js";
import { getDb } from "./db.js";

const MAX_ROWS = 200;

export type QueryResult =
  | { sql: string; rows: Record<string, unknown>[]; rowCount: number; truncated: boolean }
  | { error: string; rows: []; rowCount: 0 };

export function runSelect(sql: string): QueryResult {
  const guard = isReadOnlySelect(sql);
  if (!guard.ok) return { error: guard.reason, rows: [], rowCount: 0 };
  try {
    const rows = getDb().prepare(sql).all() as Record<string, unknown>[];
    const capped = rows.slice(0, MAX_ROWS).map((r) => ({ ...r }));
    return { sql, rows: capped, rowCount: rows.length, truncated: rows.length > MAX_ROWS };
  } catch (err) {
    return { error: `SQL error: ${(err as Error).message}`, rows: [], rowCount: 0 };
  }
}
