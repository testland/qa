# Three tickets for one checkout failure, and only one of them is usable

## Problem Description

Support, QA, and a customer-success manager all opened tickets for what looks
like the same checkout failure over a two-week window. Engineering is now
arguing about which one to work in, and two of the three keep getting new
comments, so nobody is sure where the real information lives.

The export below is everything the tracker has on the promo/checkout area
right now, including some tickets that merely mention promo codes. One older
ticket was already closed against another ticket back in July, which nobody
has looked at since.

We want to end up with a single ticket that engineering works in, no
information lost from the ones we stop using, and no ticket touched that isn't
actually the same failure. This is a review, not an execution - nobody is
allowed to touch the tracker until the plan is agreed.

## Output Specification

Produce exactly two files:

1. `duplicate-resolution.md` - the grouping decision. State which tickets
   describe one and the same failure, which single ticket engineering will
   work in and why that one, what information sitting on the others has to be
   moved onto it before anything is stopped, and how each stopped ticket must
   be recorded so a reader who lands on it later can follow the trail. List
   separately the tickets that mention promo codes but are a different failure,
   with one line each saying why they stay untouched.
2. `merge-actions.csv` - one row per ticket you would touch, with columns
   `issue,action,target,reason`. Tickets you deliberately leave alone are not
   rows here; they belong in the markdown.

Out of scope: severity and priority values, assignment, and any change to how
CI files tickets. Do not rewrite ticket titles.

## Input Files

Extract the following files before beginning.

=============== FILE: exports/issues.csv ===============
number,title,state,state_reason,labels,assignee,created,last_activity,repro_steps,environment,linked_pr,comments
398,"Checkout page broken after promo code",open,,"bug,severity:high,priority:p2",,2026-07-02,2026-07-04,none,,,"3 comments; comment 2 lists the 4 enterprise accounts that hit it and their order ids"
412,"Applying promo SAVE20 empties the cart and returns 500 from POST /api/checkout",open,,"bug,severity:high,priority:p2",r.mehta,2026-07-09,2026-08-11,"6 numbered steps, curl reproduction, stack trace from promo-engine","web 4.18.2 / Chrome 128 / staging-eu",#1290,"2 comments, both from r.mehta"
420,"500 error at checkout when SAVE20 is applied",open,,"bug,severity:high,priority:p2",,2026-07-14,2026-08-12,"one line: apply SAVE20 and it blows up",,,"11 comments; 9 subscribers including 2 support agents and the CS manager"
389,"Cart dies with promo",closed,duplicate,"bug",,2026-06-28,2026-07-03,none,,,"closed 2026-07-03 with the comment 'Duplicate of #398'"
355,"Cart total is wrong when the same promo is applied twice",open,,"bug,severity:medium,priority:p3",l.fontaine,2026-06-19,2026-08-09,"4 steps plus a totals table","web 4.18.0 / Firefox 129 / prod",#1204,"total is off by the discount amount; cart is not emptied and no 500 is returned"
401,"Promo banner text overflows on small screens",open,,"bug,severity:trivial,priority:p4",,2026-07-05,2026-07-06,"screenshot only","web 4.18.1 / iOS Safari",,"cosmetic"
430,"Checkout returns 500 when the cart contains a gift card",open,,"bug,severity:high,priority:p2",r.mehta,2026-07-30,2026-08-10,"3 steps","web 4.18.2 / Chrome 128 / prod",#1301,"traced to the gift-card ledger, no promo involved"
