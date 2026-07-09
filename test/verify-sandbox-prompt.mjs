import { Client } from "eve/client";
const HOST = process.env.EVE_HOST || "https://eve-analyst.vercel.app";
const c = new Client({ host: HOST });
const s = c.session();
const prompt =
  "Use the run_analysis tool to run a Python script that computes the week-over-week revenue " +
  "change from these two weekly totals in cents: prior week 264389, most recent week 148500. " +
  "Print the dollar change and the percent change, rounded to one decimal.";
console.log(">>>", prompt);
const r = await (await s.send(prompt)).result();
const tools = [];
for (const e of r.events || []) if (e.type === "actions.requested") for (const a of e.data.actions || []) tools.push(a.toolName);
console.log("tools:", tools.join(", "));
console.log("reply:", (r.message || "").replace(/\s+/g, " ").slice(0, 500));
