# Two incidents inside the window the gate was green

## INC-3401 — promo SAVE10 billed at 10% OF list, not 10% OFF (2026-09-02, open)

A £20.00 item with SAVE10 applied should be charged £18.00. It was charged
£2.00. 1,140 orders across six hours before someone in finance noticed the
daily reconciliation. Still live; billing team's fix is #4412, in review.

Detected by: finance reconciliation. Not by the gate.

## INC-3388 — dashboard returned 401 to signed-in users for 22 minutes (2026-08-21)

A session-store rollout invalidated every live token. The gate ran three times
during the window and was green each time.

Detected by: support volume. Not by the gate.

## Gate record

47 consecutive green runs, 2026-07-19 to 2026-09-11. No red run in the window.
The unit suite has two tests, both on the auth path. Nothing anywhere covers
`priceCart`.
