# Baggage fee rules have been edited by four people and nobody has read the result

## Problem Description

The extract below is the current checked-baggage section of the fare rules.
Sentences have been added to it over about three years, each time someone found
a case they thought was not covered, and nobody has ever read the whole thing
end to end against the other sentences.

The result is that some sentences repeat what earlier sentences already say, and
at least one appears to price a passenger that an earlier sentence says travels
free. The revenue team wants the section rewritten, but before anyone rewrites
it we need to know what it currently means for every kind of passenger, and
which of its sentences are doing any work.

There are four things about a passenger and their bag in here. I want the fee
for every combination of them, and I want to know how many genuinely different
cases QA actually has to check at the bag drop, because the current test script
has thirty-something rows and I suspect most of them are the same case typed out
again.

## Output Specification

Produce `baggage-fee-analysis.md` containing:

1. The four things about a passenger and their bag that the extract turns on,
   one per line.
2. A table giving the total bag fee for every combination of them.
3. The number of genuinely different cases that table reduces to, with the
   reasoning - if one of the four things stops mattering for a group of
   passengers, say which and where.
4. Any sentence in the extract that could be deleted without changing what a
   single passenger pays, and why.
5. Any sentence that disagrees with another sentence, raised for the revenue
   team to settle rather than settled here.
6. The bag drops QA should check, one per genuinely different case.

Out of scope: second and subsequent bags, cabin baggage, sports equipment, and
codeshare itineraries. First checked bag only.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/baggage-fees.md ===============
# Checked baggage - first bag (fare rules extract)

Gold cardholders check one bag free on any fare.

On a Standard fare the first checked bag is free.

On a Basic fare the first checked bag is EUR 35 when it is paid at the airport,
or EUR 25 when it is paid online before departure.

A bag over 23 kg carries a heavy-bag fee of EUR 60 on top of any bag fee.

Gold cardholders are not charged the heavy-bag fee.

Gold cardholders travelling on a Standard fare check their first bag free.

Gold cardholders on a Basic fare pay EUR 25 for a bag paid online.

Fares are either Basic or Standard; there is no third fare family on this
route group.
