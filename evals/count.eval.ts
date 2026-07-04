import { defineEval } from "eve/evals";

export default defineEval({
  description: "Answers a simple raw count with run_sql.",
  async test(t) {
    await t.send(
      "How many rows are in the customers table in total? Give me the raw count of every row, " +
        "including any test accounts.",
    );
    t.succeeded();
    t.calledTool("run_sql");
    t.messageIncludes("14"); // the seeded dataset has exactly 14 customer rows
  },
});
