import { defineEval } from "eve/evals";

export default defineEval({
  description: "Loads the revenue-rules skill and queries the data for a revenue question.",
  async test(t) {
    await t.send("What was our total revenue across all time?");
    t.succeeded();
    t.loadedSkill("revenue-rules");
    t.calledTool("run_sql");
  },
});
