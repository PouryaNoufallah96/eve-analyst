import { defineEval } from "eve/evals";

export default defineEval({
  description: "Discovers the schema via list_tables before answering.",
  async test(t) {
    await t.send("What tables are in the warehouse, and how many rows does each have?");
    t.succeeded();
    t.calledTool("list_tables");
    t.messageIncludes("customers");
  },
});
