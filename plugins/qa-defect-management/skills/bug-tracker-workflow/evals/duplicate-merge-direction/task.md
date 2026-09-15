# The merge ran on Friday, picked a survivor, and stopped halfway

## Problem Description

Yuki in support operations ran our dedupe script across the promo and checkout
area on Friday afternoon. Our written convention is that the oldest open report
is the canonical one and newer reports are closed against it, which exists for
a good reason: support has already given the canonical number to customers and
they quote it back to us.

So the script closed #412 against #398, and then it stopped. The run log is
attached. Nothing else was touched - #420 is still open, and the step that
copies information onto the surviving report never ran for anything.

Engineering has spent this week arguing about it and someone has written up
what the merge cost them. Yuki's instinct is to fix the run and let it finish
the job the same way. I want a decision I can put in front of both of them on
Monday, and I want to know what has to change before that script is pointed at
the tracker again.

Nobody touches the tracker until the plan is agreed.

## Output Specification

Produce exactly two files:

1. `merge-correction.md` - which report engineering works in and why, what has
   to move onto it and from where before anything else is stopped, what to do
   about the close that has already been applied, and how customers holding the
   old number are looked after without keeping it as the working report. Then:
   what has to change in the convention itself, quoting the line it replaces,
   and what has to change about the script before it runs again, using the run
   log. List separately the promo-area reports that are a different failure,
   one line each.
2. `correction-plan.csv` - one row per report you would touch, columns
   `issue,action,target,reason`. Reports you deliberately leave alone are not
   rows here; they belong in the markdown.

Out of scope: severity and priority values, assignment, and how CI files
reports. Do not rewrite report titles.

## Input Files

Extract the following files before beginning.

=============== FILE: exports/issues.csv ===============
number,title,state,state_reason,assignee,created,repro_steps,environment,linked_pr,comments
398,"Checkout page broken after promo code",open,,,2026-07-02,none,,,"3 comments; comment 2 lists the 4 enterprise accounts that hit it and their order ids"
412,"Applying promo SAVE20 empties the cart and returns 500 from POST /api/checkout",closed,completed,r.mehta,2026-07-09,"6 numbered steps, curl reproduction, stack trace from promo-engine","web 4.18.2 / Chrome 128 / staging-eu",#1290,"2 comments from r.mehta; closed 2026-08-14 by the dedupe run"
420,"500 error at checkout when SAVE20 is applied",open,,,2026-07-14,"one line: apply SAVE20 and it blows up",,,"11 comments; 9 subscribers including 2 support agents and the CS manager"
389,"Cart dies with promo",closed,duplicate,,2026-06-28,none,,,"closed 2026-07-03 with the comment 'Duplicate of #398'"
355,"Cart total is wrong when the same promo is applied twice",open,,l.fontaine,2026-06-19,"4 steps plus a totals table","web 4.18.0 / Firefox 129 / prod",#1204,"total is off by the discount amount; cart is not emptied and no 500 is returned"
401,"Promo banner text overflows on small screens",open,,,2026-07-05,"screenshot only","web 4.18.1 / iOS Safari",,"cosmetic"
430,"Checkout returns 500 when the cart contains a gift card",open,,r.mehta,2026-07-30,"3 steps","web 4.18.2 / Chrome 128 / prod",#1301,"traced to the gift-card ledger, no promo involved"

=============== FILE: docs/dedupe-convention.md ===============
# Duplicate handling - support operations, revised 2026-03-11

> When two or more reports describe the same failure, **the oldest open report
> is canonical.** Later reports are closed against it. Support has already
> given the canonical number to the customer and changing which number is live
> creates a second round of customer contact for no benefit.

Applies to the promo, checkout and billing areas. Owner: support operations.

=============== FILE: logs/friday-run.md ===============
# Dedupe run 2026-08-14, 16:02-16:09

The script walks every open report in the area, and for each one calls the
search endpoint to find the reports that look like it, before it groups them.

```
16:02:11  scanning 63 candidates in area promo/checkout
16:04:40  group formed: [398, 412] canonical=398 (oldest)
16:04:41  closed #412  -> state_reason=completed
16:06:02  search 403  x-ratelimit-remaining: 0   x-ratelimit-reset: 16:35:00
16:06:02  search 403  x-ratelimit-remaining: 0
16:06:03  aborted after 31 of 63 candidates
16:06:03  step 'carry comments to canonical' not reached
```

=============== FILE: docs/what-it-cost.md ===============
# Note from engineering, 2026-08-20

#412 was the only report in the group with steps, an environment, and a linked
fix branch (#1290). It is now closed and reads as completed work, so the
reporter has been into the thread twice asking which release the fix is in.

#398 is what we are left working in: a title, no steps, no environment, no
branch. r.mehta spent Monday and Tuesday re-deriving the reproduction from a
support call recording because #412's curl reproduction was on a report the
board now filters out.

The four enterprise account ids are still in a comment on #398 and have not
moved anywhere. The subscriber thread on #420 is still on #420. #389, closed
back in July, points at #398.
