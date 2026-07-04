import { defineTool } from "eve/tools";
import { z } from "zod";
import { isReadOnlySelect, looksExpensive } from "../lib/sql-guard.js";
import { runSelect } from "../lib/run-select.js";

export default defineTool({
  description:
    "Run a single read-only SQL SELECT against the warehouse and return the rows. Only SELECT " +
    "queries are allowed; any write is rejected. An unbounded full-table scan requires the " +
    "user's approval before it runs, so prefer WHERE and LIMIT.",
  inputSchema: z.object({
    sql: z.string().describe("A single read-only SQL SELECT statement (SQLite dialect)."),
  }),
  // Human-in-the-loop: pause for approval only when the query is a valid but expensive scan.
  approval: ({ toolInput }) => {
    const sql = typeof toolInput?.sql === "string" ? toolInput.sql : "";
    const guard = isReadOnlySelect(sql);
    if (!guard.ok) return "not-applicable"; // rejected in execute; no point prompting a human
    return looksExpensive(sql) ? "user-approval" : "not-applicable";
  },
  async execute({ sql }) {
    return runSelect(sql);
  },
});
