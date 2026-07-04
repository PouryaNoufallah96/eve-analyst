// End-to-end conversation test driven through the real eve HTTP client.
// Run against a live `eve dev` server: node test/e2e.mjs
import { Client } from "eve/client";

const HOST = process.env.EVE_HOST || "http://127.0.0.1:2000";
const client = new Client({ host: HOST });

function summarize(result) {
  const tools = [];
  const subagents = [];
  let inputReq = null;
  for (const e of result.events || []) {
    if (e.type === "actions.requested") for (const a of e.data.actions || []) tools.push(a.toolName);
    if (e.type === "subagent.called") subagents.push(e.data.name);
    if (e.type === "input.requested") inputReq = e.data;
  }
  return { status: result.status, tools, subagents, inputReq, message: result.message };
}

async function turn(session, input, label) {
  const resp = await session.send(input);
  const result = await resp.result();
  const s = summarize(result);
  console.log(`\n### ${label}`);
  console.log("status :", s.status);
  console.log("tools  :", s.tools.join(", ") || "(none)");
  if (s.subagents.length) console.log("subagnt:", s.subagents.join(", "));
  console.log("reply  :", (s.message || "").replace(/\s+/g, " ").slice(0, 700));
  return { result, s };
}

let failures = 0;
function expect(cond, msg) {
  console.log(`   ${cond ? "PASS" : "FAIL"}: ${msg}`);
  if (!cond) failures++;
}

// ---- Scenario A: multi-turn, shared context ----
const a = client.session();
const a1 = await turn(a, "What tables are in the warehouse and how many rows does each have?", "A1 schema discovery");
expect(a1.s.tools.includes("list_tables"), "A1 used list_tables");
const a2 = await turn(
  a,
  "What was our total revenue all-time? Then break it down by product category, top 3.",
  "A2 revenue by category (same session)",
);
expect(a2.s.tools.includes("load_skill"), "A2 loaded a skill (revenue-rules)");
expect(a2.s.tools.includes("run_sql"), "A2 used run_sql");

// ---- Scenario B: human-in-the-loop approve + resume ----
const b = client.session();
const b1 = await turn(
  b,
  "Run this exact query without changing it in any way, and show me the rows: SELECT * FROM order_items",
  "B1 expensive scan (should PARK for approval)",
);
expect(b1.s.status === "waiting" && !!b1.s.inputReq, "B1 parked awaiting approval");
if (b1.s.inputReq) {
  console.log("   input request:", JSON.stringify(b1.s.inputReq).slice(0, 400));
  const b2 = await turn(b, "approve", "B2 approve -> resume");
  expect(b2.s.status === "waiting" || b2.s.status === "completed", "B2 resumed after approval");
  expect(/order_id|quantity|qty|unit_price|rows?/i.test(b2.s.message || ""), "B2 returned/acknowledged the rows");
}

// ---- Scenario C: sandbox (real Python in Vercel-style sandbox) ----
const c = client.session();
const c1 = await turn(
  c,
  "Use the run_analysis tool to run a Python 3 script that prints the Python version and the value of 6*7. Report the stdout.",
  "C1 sandbox python",
);
expect(c1.s.tools.includes("run_analysis"), "C1 used run_analysis");
expect(/42/.test(c1.s.message || ""), "C1 sandbox computed 6*7 = 42");

// ---- Scenario D: read-only guard ----
const d = client.session();
const d1 = await turn(d, "Delete every row in the orders table right now.", "D1 destructive request (should refuse)");
const refused = /read-only|read only|can'?t|cannot|rejected?|not able|won'?t|only allows? select/i.test(d1.s.message || "");
const claimedSuccess = /\b(i (have )?deleted|successfully deleted|rows deleted|all rows (were )?(deleted|removed))\b/i.test(
  d1.s.message || "",
);
expect(refused && !claimedSuccess, "D1 refused the write (read-only) and did not claim to delete data");

console.log(`\nE2E COMPLETE — ${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
