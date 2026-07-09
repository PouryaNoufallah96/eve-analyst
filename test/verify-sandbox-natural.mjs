import { Client } from "eve/client";
const HOST = process.env.EVE_HOST || "https://eve-analyst.vercel.app";
const c = new Client({ host: HOST });

// Median is not a SQLite built-in, so Python is genuinely required -> strong, clean sandbox demo.
// Distinct from beat 6 (category) and beat 9 (weekly drop). No partial-week landmine.
const prompt =
  "Pull the total dollar value of every paid or fulfilled order with a SQL query, then use the " +
  "run_analysis tool to run Python that computes the average order value, the median order value, " +
  "and the largest single order. Print all three.";

const s = c.session();
const r = await (await s.send(prompt)).result();
const tools = [];
for (const e of r.events || []) if (e.type === "actions.requested") for (const a of e.data.actions || []) tools.push(a.toolName);
const msg = (r.message || "").replace(/\s+/g, " ");
console.log("prompt:", prompt);
console.log("tools :", tools.join(", "));
console.log("run_sql:", tools.includes("run_sql"), " run_analysis:", tools.includes("run_analysis"));
console.log("reply :", msg.slice(0, 700));
