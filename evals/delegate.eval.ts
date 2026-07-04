import { defineEval } from "eve/evals";

export default defineEval({
  description: "Delegates an open-ended investigation to the investigator subagent.",
  async test(t) {
    await t.send(
      "Our revenue looks like it dropped in the most recent week. Investigate why and report " +
        "the specific cause with numbers. Use your investigator subagent to do the digging.",
    );
    t.calledSubagent("investigator");
  },
});
