---
description: Load before answering any revenue, sales, or growth question. Defines how this company recognizes revenue.
---

# Revenue rules

Apply these definitions to every revenue, sales, or growth number.

- Revenue is recognized **net of refunds**: sum `order_items.unit_price_cents * qty`, then
  subtract any `refunds.amount_cents` for those orders.
- **Exclude test and internal accounts**: any customer where `is_test = 1` (these use
  addresses at `example.com`). Never count them in revenue or customer totals.
- Money is stored in **cents**. Divide by 100 to report dollars.
- Only orders with status `paid` or `fulfilled` count toward revenue. `cancelled` orders do not.
- Fiscal **weeks start on Monday**. "Last week" means the most recent complete Monday-to-Sunday
  week present in the data.

When you report a revenue number, state briefly that it is net of refunds and excludes test
accounts.
