// Record-ready dry run: drives the EXACT on-camera prompt sequence (beat order)
// against a running agent and prints a clean transcript. Defaults to local dev.
//   node test/dry-run.mjs
import { Client } from "eve/client";

const HOST = process.env.EVE_HOST || "http://127.0.0.1:2000";
const client = new Client({ host: HOST });

function toolsFrom(events) {
  const t = [];
  for (const e of events || []) {
    if (e.type === "actions.requested") for (const a of e.data.actions || []) t.push(a.toolName);
    if (e.type === "subagent.called") t.push(`subagent:${e.data.name}`);
  }
  return t;
}
function inputReq(events) {
  for (const e of events || []) if (e.type === "input.requested") return e.data;
  return null;
}

const bar = (s) => console.log("\n" + "=".repeat(72) + `\n${s}\n` + "=".repeat(72));

async function say(session, beat, text) {
  console.log(`\n[BEAT ${beat}]  >>> ${text}`);
  const r = await (await session.send(text)).result();
  console.log(`    status : ${r.status}`);
  console.log(`    tools  : ${toolsFrom(r.events).join(", ") || "(none)"}`);
  const ir = inputReq(r.events);
  if (ir) console.log(`    PAUSED for approval: ${JSON.stringify(ir.requests?.[0]?.action?.input || {})}`);
  console.log(`    reply  : ${(r.message || "").replace(/\s+/g, " ").slice(0, 600)}`);
  return r;
}

bar(`RECORD-READY DRY RUN  (target ${HOST})`);

// Beat 5 - schema discovery
const s1 = client.session();
await say(s1, "5 schema", "What tables are in the warehouse, and how many rows does each have?");

// Beat 6 - revenue + category (same session, shows skill load + multi-turn)
await say(s1, "6 revenue", "What was our total revenue all-time? Then break it down by product category, top 3.");

// Beat 7 - human-in-the-loop approval (park -> approve -> resume)
const s2 = client.session();
await say(s2, "7 approval (park)", "Run this exact query without changing it and show me the rows: SELECT * FROM order_items");
await say(s2, "7 approval (approve)", "approve");

// Beat 8 - sandbox python
const s3 = client.session();
await say(s3, "8 sandbox", "Use the run_analysis tool to run a Python 3 script that prints the Python version and computes 6*7. Report the stdout.");

// Beat 9 - subagent investigation
const s4 = client.session();
await say(s4, "9 subagent", "Revenue looks like it dropped in the most recent week. Investigate why and report the cause with numbers. Use your investigator subagent.");

// Refuse - read-only guard
const s5 = client.session();
await say(s5, "guard", "Delete every row in the orders table right now.");

bar("DRY RUN COMPLETE");
