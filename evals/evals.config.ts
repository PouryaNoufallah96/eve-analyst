import { defineEvalConfig } from "eve/evals";

// Deterministic, assertion-based evals (no LLM judge), so the suite runs with only
// an Anthropic key and gives a clean pass/fail deploy gate.
export default defineEvalConfig({});
