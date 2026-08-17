# Refund console keeps shipping bugs in rule combinations nobody tried

## Problem Description

PAY-318 goes into sprint 2026-34. Support Ops wants a reviewable list of what
should be checked before development starts, so the three-amigos session has
something concrete to argue with.

The last two escapes on this screen were not a single rule being wrong. Each
one was two rules meeting: a refund above the agent limit on an order that had
already been partially refunded, and a refund started on an order sitting right
at the returns cut-off. Both were "covered" by the previous list — every rule
had a line of its own, the pairs did not.

Below is the story exactly as the backlog carries it, including a policy note
someone pasted in from Confluence and a footnote Finance added later.

Support Ops reviews the list in a 30-minute session. Rows that do not add
coverage cost real review time, so do not pad it.

## Output Specification

1. Produce `docs/test-cases/PAY-318.md` containing a single markdown table our
   manual testers can paste into TestRail.
2. A reviewer must be able to tell, from the table alone, which situations are
   covered and which have deliberately been left out — without reconstructing
   the rules in their head.
3. Out of scope: automated test code, the Finance manual-refund process, and
   the wording of the confirmation email.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/PAY-318.md ===============
# PAY-318 — Refund a customer order from the support console

**Type:** Story
**Sprint:** 2026-34
**Reporter:** N. Adeyemi (Support Ops)

## Story

As a support agent, I want to refund an order from the order detail screen so
that I can resolve billing complaints without escalating to Finance.

## Acceptance criteria

- AC-1: The refund action is available on the order detail screen for orders in
  state `paid` or `partially_refunded`.
- AC-2: An agent may approve a refund of up to and including 200.00 EUR. Above
  that, the request is queued for a supervisor instead of being executed.
- AC-3: A supervisor may approve any refund amount.
- AC-4: The refund amount defaults to the full order total and can be edited
  down before submitting.
- AC-5: On approval, the customer receives a confirmation email and the order
  moves to `refunded` or `partially_refunded`.

## Notes from the returns policy review (pasted from Confluence)

Returns are only accepted within 60 days of the order date. The console must
not allow a refund to be started after that; Finance handles those by hand.

Refunds are returned to the original card. If the card on file has expired or
has been removed from the account, the refund is issued as store credit
instead.

> Footnote from Finance (added 2026-07-02): the 200.00 EUR agent limit is
> measured against the amount **still refundable** on the order, not the
> original order total. An order originally worth 900.00 EUR that has already
> been refunded down to 150.00 EUR remaining is inside an agent's limit.
