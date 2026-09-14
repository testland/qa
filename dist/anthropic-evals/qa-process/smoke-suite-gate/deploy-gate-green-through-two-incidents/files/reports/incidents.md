# Two incidents inside the window the gate was green

## INC-3401 — promo SAVE10 charged the wrong amount (2026-09-02, open)

Orders with SAVE10 applied between 04:10 and 10:20 were charged an amount
nobody can account for. 1,140 orders went through before the daily finance
reconciliation caught it. Sample rows from the ledger:

| Order     | Cart basket | Promo  | Charged |
|-----------|-------------|--------|---------|
| AUB-77120 | £20.00      | SAVE10 | £2.00   |
| AUB-77131 | £45.00      | SAVE10 | £4.50   |
| AUB-77144 | £12.50      | SAVE10 | £1.25   |

Still live; the billing team's fix is #4412, in review.

Detected by: finance reconciliation. Not by the gate.

## INC-3388 — dashboard returned 401 to signed-in users for 22 minutes (2026-08-21)

A session-store rollout invalidated every live token. Signed-in users got a 401
from the dashboard endpoint until it was rolled back. The gate ran three times
during the window and was green each time.

Detected by: support volume. Not by the gate.

## Gate record

47 consecutive green runs, 2026-07-19 to 2026-09-11. No red run in the window.
No deploy in the window was held back.
