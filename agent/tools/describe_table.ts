import { defineTool } from "eve/tools";
import { z } from "zod";
import { describeTable, tableNames } from "../lib/db.js";

export default defineTool({
  description: "Describe the columns (name and type) of one warehouse table.",
  inputSchema: z.object({
    table: z.string().describe("Exact table name as returned by list_tables."),
  }),
  async execute({ table }) {
    if (!tableNames().includes(table)) {
      return { error: `Unknown table "${table}". Call list_tables first.` };
    }
    return { table, columns: describeTable(table) };
  },
});
