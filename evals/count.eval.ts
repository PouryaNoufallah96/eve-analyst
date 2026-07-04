import { defineEval } from "eve/evals";

export default defineEval({
  description: "Uses run_sql for a filtered aggregate that list_tables cannot answer.",
  async test(t) {
    await t.send(
      "How many orders have the status 'cancelled'? Run a SQL query against the orders table to " +
        "count them, and give me the number.",
    );
    t.succeeded();
    t.calledTool("run_sql");
  },
});
