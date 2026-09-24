# `revenue_daily` — model spec

## Context

Finance has rebuilt this in a spreadsheet every month since the Stripe
migration and it costs Marta about two days each time. The board deck pulls
from her sheet today. Getting the model into the warehouse before the Q3 close
is what lets the deck point at the warehouse instead.

## What the model does

`revenue_daily.gross_amount` equals the sum of `orders.amount_cents / 100` over
orders with `status = 'captured'` whose `captured_at` falls inside the target
day in the merchant's local timezone.

`revenue_daily` holds one row per `(merchant_id, day)` and the pair
`(merchant_id, day)` is unique.

Orders captured before the target day but written to `orders` after that day's
run are folded into the affected day's row on a later run.

`revenue_daily` reconciles with the finance team's numbers.

The model should be trustworthy enough to put in front of the board.

## Notes

Risk: the payments team has floated changing the `orders.status` vocabulary in
Q4, which would land underneath us.

Open question: does day one need multi-currency, or can we assume USD until the
EU launch?
