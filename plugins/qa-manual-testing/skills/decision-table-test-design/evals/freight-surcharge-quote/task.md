# Freight quotes and invoices disagree on tail-lift jobs

## Problem Description

The quoting screen and the invoicing job both implement the surcharge schedule
below, and they were written by different teams eight months apart. Finance has
found four jobs this quarter where the quote and the invoice differ, all of them
tail-lift deliveries, and they want to know whether there are more shapes of job
where the two can disagree before they go back through a year of invoices.

The schedule has four yes/no facts about a shipment in it. What makes it awkward
is that some of them change the rate of a surcharge rather than adding one, and
one of them switches another surcharge off entirely.

What I want is the money answer for every possible shipment shape, worked out
from the schedule alone, so we can run both systems against the same list and
see where they part company. Where the schedule genuinely does not say, I want
that written down as not saying rather than guessed at, because a guess here is
what got us the four bad invoices.

## Output Specification

Produce `surcharge-rules-analysis.md` containing:

1. The four yes/no facts about a shipment that the schedule turns on, one per
   line.
2. Each surcharge the schedule can apply, listed separately, with its amount -
   two surcharges that differ in amount are two different results, not one.
3. A table giving the total surcharge for every possible shipment shape.
4. Any shipment shape whose total you could not work out from the schedule,
   listed as an open question rather than filled in with a plausible number.
5. Any place where one of the four facts makes no difference at all to the
   total, stated explicitly so the test list does not repeat the same job twice.
6. The shipments QA should quote and invoice as the comparison list.

Out of scope: VAT, fuel surcharge indexation, and the customer-specific rate
agreements. Assume list pricing throughout, and do not change any code.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/surcharge-schedule.md ===============
# Pallet freight surcharge schedule (list pricing)

Base surcharge on a standard dock-to-dock delivery: EUR 0.

Residential delivery carries an access surcharge of EUR 25.

A delivery requiring a tail lift adds EUR 40.

At a residential address the tail lift is charged at EUR 60 rather than EUR 40,
because the driver works without a dock.

Island destinations carry a ferry surcharge of EUR 90. The residential access
surcharge is not applied to island destinations.

Shipments over 500 kg carry a heavy-goods surcharge of EUR 30. Island shipments
are quoted per shipment and carry no heavy-goods surcharge.

Surcharges that apply are added together and shown as one line on the invoice.
