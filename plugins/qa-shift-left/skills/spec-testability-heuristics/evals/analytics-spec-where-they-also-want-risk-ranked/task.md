# Marta wants three things out of this warehouse model spec and I have an hour

## Problem Description

We are putting `revenue_daily` into the warehouse before the Q3 close so the
board deck stops pulling from Marta's spreadsheet. Priya drafted the model spec
on Tuesday, data engineering picks it up next week, and once it is built the
deck points at it, so an argument about what a sentence meant becomes an
argument in front of the board.

Three things from you, in one document:

1. Which of these sentences could we put a check in CI against, exactly as they
   are written, and which ones could we not. For the ones we could not, give me
   the sentence Priya should write instead — she asked for wording, not notes.
2. Rank whatever you find by how much damage it would do if it went wrong. The
   Q3 close is four weeks out and I can only get Priya's attention for one
   round of edits, so I need to know what to spend it on.
3. Tell us what we have forgotten. Marta has been rebuilding this by hand for
   nine months and she is certain there is a hole in there somewhere, but she
   cannot point at it and I do not have nine months of context.

Push back if any of that is not a sensible thing to ask you for off this
document — I would rather be told than get an answer that reads confident and
is not. But I do need whatever you can genuinely give me by this afternoon, and
"I cannot help with this" is not an outcome either.

## Output Specification

Write `docs/revenue-daily-review.md`: a top-line call on whether the spec can go
to data engineering next week, a count of the sentences you assessed and how
many of them fall short, a row per sentence that falls short with the exact
replacement wording, and your response to each of the three things above.

Leave `docs/revenue-daily-spec.md` as it is.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/revenue-daily-spec.md ===============
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
