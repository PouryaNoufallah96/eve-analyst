import { defineTool } from "eve/tools";
import { z } from "zod";
import { runSelect } from "../../../lib/run-select.js";

// The investigator is an autonomous analysis agent, so its read-only SQL runs
// without the human approval gate that the primary agent uses. Read-only
// enforcement still applies via runSelect.
export default defineTool({
  description:
    "Run a single read-only SQL SELECT against the warehouse and return the rows. Only SELECT " +
    "queries are allowed; writes are rejected. Runs without approval prompts.",
  inputSchema: z.object({
    sql: z.string().describe("A single read-only SQL SELECT statement (SQLite dialect)."),
  }),
  async execute({ sql }) {
    return runSelect(sql);
  },
});
