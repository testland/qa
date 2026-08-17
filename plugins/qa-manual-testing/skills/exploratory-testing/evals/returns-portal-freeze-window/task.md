# Two 45-minute slots on refunds before Friday's freeze

## Problem Description

Our self-serve returns portal (v2) goes live Monday. Code freeze is Friday
09:00. I have one tester, Priya, and she has exactly two free 45-minute
blocks on Thursday afternoon - the rest of her day is babysitting the
nightly regression suite.

What finance is actually worried about is partial refunds on multi-item
orders where one of the items was paid for with store credit. They caught
two mismatches in staging last week between the refund amount we display
and the amount that lands back on the card. Nobody has been able to say
whether those were data problems or logic problems.

The card-capture screens are handled by our payments vendor under their own
test plan and Priya must not touch them. The shared payment sandbox is also
reserved by the mobile team from 15:00, so anything needing a real
authorisation has to happen in the first block.

I want something I can hand Priya on Thursday morning and something I can
read on Friday before I sign off the freeze. Last time we did this she
handed me four pages of "clicked X, saw Y" and I could not tell what she
had actually decided about the release.

## Output Specification

Produce a single file: `docs/testing/returns-v2-thursday.md`.

It must contain:

1. For each of the two blocks, one stated objective: what area is being
   worked, with what data or tooling, and what we should know at the end
   that we do not know now.
2. The specific parts of the portal each block covers, and the parts
   deliberately left untouched with a one-line reason.
3. The structure Priya uses to record what happens as she goes, arranged so
   a reader can tell apart things confirmed to work, defects, and questions
   that need a finance or product answer rather than a fix.
4. The write-up she hands me at the end of each block, including what is
   still unknown, what she would work next, and her own read on whether
   this is safe to ship.
5. A stated condition under which she abandons a block early, and what
   happens to the remaining time.
6. How the 45 minutes in each block get accounted for afterwards.

Total tester time available: 90 minutes, in two 45-minute blocks, first
block before 15:00. Out of scope: the vendor card-capture screens, load and
performance, and the browser/device matrix.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/returns-v2-brief.md ===============
# Returns portal v2 - release brief

**Ship date:** Monday
**Freeze:** Friday 09:00
**Owning squad:** Post-purchase

## What changed in v2

- A customer can now return individual items from an order instead of the
  whole order.
- Refunds are split across the original tenders: card, store credit, and
  gift card, in that order of repayment.
- Shipping fees are refunded only when every item in the order is returned.
- The refund amount shown in the portal is calculated in the browser from
  the order payload; the authoritative amount is recalculated server-side
  when the return is submitted.
- Returns for orders older than 30 days require an agent override code.

## Known open items

- REF-1187: staging shows a 3.40 discrepancy on a two-item order where one
  item was bought with 10.00 of store credit. Not reproduced on demand.
- REF-1191: finance reported a second mismatch, order not identified.
- The server-side recalculation was added late and has no unit coverage
  for the mixed-tender path.
- Agent override codes are seeded manually in staging; there are currently
  four valid codes.

## Environment notes

- Staging: returns-stg.internal, seeded nightly at 02:00.
- Payment sandbox is shared. Mobile squad holds it from 15:00 daily.
- Test accounts with store-credit balances: three exist, balances 5.00,
  10.00, 50.00. Credit is not automatically restored after a test run.
- Card-capture screens are served from the vendor's domain and are covered
  by the vendor's own certification, not by us.
