# Customer says the amount on her transfer doesn't match her statement

## Problem Description

Tier 1 support escalated a payments complaint to us this morning. The customer
moved money between two of her own accounts and says the amount that landed is
not the amount she sent, and that her balance no longer adds up. The agent took
the call, typed some notes, and pushed the ticket to the Payments queue.

Nobody on the payments team has seen this behaviour before, and the ticket is
the only record we have. There is no transfer reference, the screenshot she sent
is cropped to the page header, and the agent's notes disagree with the ticket
header in at least one place.

The customer leaves for a two-week holiday tomorrow, so we get exactly one reply
back to her today. Whatever we still need from her has to go out in that reply.

## Output Specification

1. Write `reports/transfer-amount-mismatch.md` — the single document the on-call
   payments engineer picks up cold, with no access to the ticket thread and no
   ability to phone the agent.
2. Every statement in the document must be traceable to the ticket. The engineer
   will treat this file as the record of what the customer actually said.
3. The document must make today's reply writeable: whoever answers the customer
   should be able to lift the outstanding questions straight out of it.

Out of scope: diagnosing the cause, reading any payments code, proposing a fix,
or contacting the customer yourself.

## Input Files

Extract the following files before beginning.

=============== FILE: inbox/ticket-4471.md ===============
Ticket:   SUP-4471
Queue:    Payments (escalated from Tier 1)
Opened:   2026-08-11 09:14 (agent local time)
Reporter: Sofia R. — identity verified by phone
Product:  Northfield personal banking
Occurrences reported: 1

--- customer message, pasted from the chat window ---

hi, i moved money from my everyday account over to my savings this morning and
the amount that showed up afterwards is not the amount i sent. the number on the
confirmation screen looked right i think, but then the line on my statement says
something different, and now my balance doesn't add up either.

this happens every single time i move money between my own accounts, it's been
like that for a while now. my husband says he has the same thing on his login.

can you just fix the balance please, i'm away from tomorrow

--- agent notes (Marcus, Tier 1) ---

- customer was "on the computer", said "the usual browser", did not want to be
  walked through checking which one
- asked for a screenshot; what came back is cropped to the page header, no
  statement line visible
- she said "the app" once later in the call — unclear whether she also tried the
  phone app or was just calling the website "the app"
- no transfer reference number captured, and I could not get her to read the two
  figures out loud before she had to go
- she has "a few accounts"; did not say which product each one is
- husband's login not checked, not on the call, no ticket from him
- escalating because balance arithmetic is involved and I can't verify it here
