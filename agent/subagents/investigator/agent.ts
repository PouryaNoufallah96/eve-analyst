import { defineAgent } from "eve";
import { anthropic } from "@ai-sdk/anthropic";

// A declared subagent. It inherits nothing from the root agent, so it carries its
// own tools, skills, and instructions. The parent delegates to it via a tool named
// "investigator" (the directory name).
export default defineAgent({
  description:
    "Investigates open-ended 'why did this metric change' questions. Runs its own read-only SQL " +
    "with a fresh context and returns a concise, evidence-backed finding with the numbers.",
  model: anthropic("claude-sonnet-5"),
});
