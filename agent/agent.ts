import { defineAgent } from "eve";
import { anthropic } from "@ai-sdk/anthropic";

// Direct Anthropic provider (reads ANTHROPIC_API_KEY). On Vercel we can also
// route through AI Gateway with a string id, but the direct provider keeps
// local dev and prod identical with a single credential.
export default defineAgent({
  model: anthropic("claude-sonnet-5"),
});
