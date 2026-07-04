# eve-analyst — Spec

A production-shaped **data analyst agent** built on Vercel's **eve** framework (v0.19.0).
You ask questions about a company's data in plain English; the agent writes read-only SQL,
respects the business's definitions, guards expensive/destructive actions behind human
approval, runs deeper number-crunching in an isolated sandbox, and delegates open-ended
investigations to a subagent. It runs over HTTP and Slack, and its behavior is locked in by
an evals suite that runs as a deploy gate.

This mirrors Vercel's own flagship internal agent **d0** (a Slack data analyst that answers
30k+ questions/month) — but built from scratch, self-contained, and fully runnable offline.

## Why this use case
It naturally exercises **every** eve primitive, so the video can teach the whole framework
through one coherent build:

| eve primitive | How this agent uses it |
|---|---|
| `instructions.md` | Analyst persona + how to reason about data questions |
| `tools/` | `list_tables`, `describe_table`, `run_sql`, `run_analysis` |
| Human-in-the-loop `approval` | `run_sql` pauses for approval on heavy/full-scan queries; writes are hard-blocked |
| `skills/` | `revenue-rules` — the company's definitions, loaded on demand |
| `subagents/` | `investigator` — delegated deep-dive with fresh context |
| Sandbox | `run_analysis` writes + runs a Python script in an isolated VM (charts/stats) |
| Channels | `eve` (HTTP, default) + `slack` |
| Durable sessions | Multi-turn analysis survives restarts/redeploys |
| Evals | Rule adherence, approval triggering, schema use, delegation |

## Dataset (bundled, deterministic)
A tiny e-commerce warehouse seeded into a local SQLite file via `node:sqlite` (zero deps,
built into Node 24). Tables: `customers`, `products`, `orders`, `order_items`, `refunds`.
Seeded by `agent/lib/seed.ts` at first use (idempotent). Includes a few **test/internal
accounts** and **refunds** so the revenue-rules skill actually matters.

## Tools
- **`list_tables`** — table names + row counts. No approval.
- **`describe_table`** — columns/types for one table. No approval.
- **`run_sql`** — executes a single **read-only `SELECT`** against the dataset.
  - Hard-rejects anything that isn't a lone SELECT (no INSERT/UPDATE/DELETE/DDL/PRAGMA/multi-statement).
  - `approval` policy: returns `"user-approval"` when the query looks **expensive** (no `LIMIT`
    and no `WHERE`, or a cross/cartesian join) so a human confirms before a full scan.
- **`run_analysis`** — sandbox tool. Writes a provided Python script to `/workspace` and runs
  it (e.g. compute a trend, render a chart to a file). Returns stdout + any artifact path.
  On Vercel this uses **Vercel Sandbox**; locally it uses Docker if available, else just-bash.

## Skill
- **`revenue-rules`** (`agent/skills/revenue-rules.md`) — revenue is recognized **net of
  refunds**; **exclude test/internal accounts**; fiscal weeks start Monday. Loaded on demand
  before answering any revenue/growth question.

## Subagent
- **`investigator`** (`agent/subagents/investigator/`) — delegated for open-ended "why did X
  change" questions. Fresh history, same SQL tools, returns a concise structured finding.

## Channels
- **`agent/channels/eve.ts`** — HTTP (default routes under `/eve/v1/...`). Dev uses
  `localDev()`; the public demo adds `none()` so the deployed endpoint is reachable for the
  video (documented tradeoff — a real deployment would put real auth here).
- **`agent/channels/slack.ts`** — Slack via Vercel Connect (scaffolded with `eve channels add slack`).

## Model
Direct Anthropic provider (`@ai-sdk/anthropic`, `claude-sonnet-5`) reading `ANTHROPIC_API_KEY`,
so local dev and prod use one credential. On Vercel the same key is set as a project env var.

## Non-goals
No external warehouse, no auth provider integration, no real payment data. Everything is
self-contained so it runs on a laptop and deploys in one command.
