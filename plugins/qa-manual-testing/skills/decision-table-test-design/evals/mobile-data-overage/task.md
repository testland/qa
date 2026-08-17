# Billing and the network team read the data policy differently

## Problem Description

The rate note below governs what a customer is charged for data and how fast
their connection runs. Billing built the charging side from it, the network
team built the throttling side from it, and neither team read the other's
implementation.

The argument that started this: a customer on an unlimited plan, roaming in
Spain, past the fair-use threshold. Billing says one sentence in the note
applies. The network team says a different sentence applies and gives a
different answer. Both sentences are in the note, and both are unqualified.

The note also has an add-on in it that clearly matters somewhere and clearly
does not matter elsewhere, and I want that written down precisely, because the
current regression pack runs the same two customers four times over.

Give me the analysis both teams and legal will sit around. Where two sentences
genuinely disagree, I want that on the page as a disagreement - not resolved by
whoever writes the document, because legal has to sign the resolution.

## Output Specification

Produce `data-billing-analysis.md` containing:

1. The facts about a customer and their usage that the note turns on, one per
   line.
2. Every distinct result the note produces. Note that the money result and the
   connection-speed result are different kinds of answer and a customer gets one
   of each.
3. A table giving both expected results for every possible combination of those
   facts.
4. Every combination where two sentences of the note give different answers,
   marked as unresolved with both readings shown.
5. Any fact that makes no difference to one of the results, said explicitly, and
   for which combinations.
6. The customers QA should set up to check both implementations.

Out of scope: non-EU roaming, tethering rules, and business tariffs. Do not
change any code.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/data-rate-note.md ===============
# Mobile data policy (rate note, consumer tariffs)

Customers on an unlimited plan are never charged for data.

Once a customer passes 100 GB within a billing cycle, connection speed is
reduced to 1 Mbit for the remainder of that cycle.

The Speed Pass add-on removes the fair-use speed reduction. It does not change
what data costs.

Data used while roaming in the EU is billed at the customer's domestic rate.

Data used while roaming in the EU above the fair-use threshold is charged at
EUR 3 per GB.

Customers not on an unlimited plan pay EUR 0.02 per MB for data used outside
their bundle allowance.

The fair-use threshold is 100 GB on every consumer tariff, unlimited or not.
