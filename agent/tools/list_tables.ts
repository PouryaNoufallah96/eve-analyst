import { defineTool } from "eve/tools";
import { z } from "zod";
import { listTables } from "../lib/db.js";

export default defineTool({
  description:
    "List the tables in the analytics warehouse with their row counts. Call this first to " +
    "discover what data is available before writing SQL.",
  inputSchema: z.object({}),
  async execute() {
    return { tables: listTables() };
  },
});
