---
description: Load before reasoning about any revenue, sales, or growth number.
---

# Revenue rules

- Revenue is recognized **net of refunds**: sum `order_items.unit_price_cents * qty`, then
  subtract `refunds.amount_cents` for those orders.
- **Exclude test/internal accounts** (`is_test = 1`, addresses at `example.com`).
- Money is stored in **cents**; divide by 100 for dollars.
- Only `paid` or `fulfilled` orders count; `cancelled` orders do not.
- Fiscal **weeks start on Monday**; "last week" is the most recent complete Monday-to-Sunday week.
