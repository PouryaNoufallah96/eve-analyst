// Adversarial / correctness checks against a running agent (defaults to the
// deployed production URL). Run: EVE_HOST=https://eve-analyst.vercel.app node test/prod-checks.mjs
import { Client } from "eve/client";

const HOST = process.env.EVE_HOST || "https://eve-analyst.vercel.app";
const client = new Client({ host: HOST });
let fails = 0;
const check = (c, m) => { console.log(`   ${c ? "PASS" : "FAIL"}: ${m}`); if (!c) fails++; };

async function ask(prompt, label) {
  const s = client.session();
  const r = await (await s.send(prompt)).result();
  const tools = [];
  for (const e of r.events || []) if (e.type === "actions.requested") for (const a of e.data.actions || []) tools.push(a.toolName);
  console.log(`\n### ${label}\nstatus: ${r.status}\ntools: ${tools.join(", ") || "(none)"}\nreply: ${(r.message || "").replace(/\s+/g, " ").slice(0, 500)}`);
  return { r, tools, msg: r.message || "" };
}

// 1. Correctness + determinism: revenue must equal the ground-truth figure.
const a = await ask("What was our total revenue across all time? Give me the dollar figure.", "1. revenue correctness");
check(/17[,.]?057\.90|17057\.9\b/.test(a.msg), "revenue is $17,057.90 (matches independently-computed ground truth)");

// 2. Empty-result edge case: must handle a query that returns nothing gracefully.
const b = await ask("How many orders were placed in the year 1990? Run a SQL query on the orders table to check.", "2. empty-result edge");
check(b.tools.includes("run_sql"), "queried with run_sql");
check(/\b0\b|none|no orders|zero/i.test(b.msg), "reported zero / no orders gracefully");

// 3. Sandbox network isolation: the video claims 'no network', so prove it.
const c = await ask(
  "Use the run_analysis tool to write and run a short Python script that attempts an HTTP GET to " +
    "https://example.com (use urllib, 5s timeout) and prints 'STATUS <code>' on success or " +
    "'BLOCKED <error>' on failure. Then tell me exactly what it printed.",
  "3. sandbox network isolation",
);
check(c.tools.includes("run_analysis"), "used run_analysis");
check(!/STATUS\s*200/.test(c.msg), "no successful HTTP 200 from the sandbox");
check(
  /block|refus|denied|unreachable|failed|error|timed?\s*out|network is unreachable|name or service|getaddrinfo|connection/i.test(c.msg),
  "network access was blocked/failed as expected",
);

console.log(`\nPROD CHECKS COMPLETE - ${fails} failed`);
process.exit(fails === 0 ? 0 : 1);
