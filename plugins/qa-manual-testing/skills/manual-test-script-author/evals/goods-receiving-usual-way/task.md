# "Scan the pallet the usual way" - our receiving coverage is one paragraph

## Problem Description

Everything we have for goods receiving is the paragraph in
`docs/receiving-notes.md`. It was written by the engineer who built the handheld
flow and it makes sense to about four people in the building.

Two of them have left. The agency operators who cover night shift cannot use it:
they do not know which scan comes first, and when they guess wrong the handheld
shows a message they report as a bug every time. It is not a bug. The paragraph
also rolls three different behaviours together - a clean delivery, a delivery
with more on the pallet than the order says, and a short delivery - so when
somebody reports "receiving is broken" we have no idea which of the three they
were doing.

Our team runs its acceptance suite through Cucumber, so these need to come back
as Given / When / Then, one behaviour at a time, in language an operator on the
floor can follow while holding a scanner.

One more thing: receiving a purchase order closes it. We have a fixed pool of
seeded orders and last quarter we ran out three weeks before the environment
rebuild.

## Output Specification

Produce one markdown document at exactly `docs/receiving-scenarios.md`
containing:

1. Given / When / Then scenarios covering the same ground as the paragraph, one
   behaviour per scenario, so a failure names one behaviour.
2. The setup shared by all of them, stated concretely enough that a night-shift
   agency operator can get to the first scan unaided, using the values in the
   attached data file.
3. Then steps that state what appears on the handheld or in the system, with
   values - never that receiving worked.
4. An arrangement of the purchase orders across the scenarios that does not
   exhaust the seeded pool faster than it needs to, and that says what a tester
   does when their scenario's order has already been used.
5. A place to record failures.

Out of scope: automating these as step definitions, putaway, cycle counting, and
anything about the label printer.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/receiving-notes.md ===============
# Receiving

Given the warehouse is set up, when the operator scans the pallet the usual
way, then receiving works. If there is more on the pallet than the order says
that should be handled too, and short deliveries need to work as well. Ask
Dmitri if the scanner does not connect.

=============== FILE: docs/wms-test-data.md ===============
# WMS staging - receiving test data

WMS web console: https://wms-staging.brightport.example
Handheld: Zebra MC3300, WMS client 4.8, cradle 3 in the QA bay.

## Getting a handheld ready

1. Sign in on the handheld with an operator badge. Badge `OP-1020`
   (M. Sowinska) is the seeded receiving operator.
2. The handheld must be bound to a dock door before it will accept a
   receiving scan. Use dock door `DD-03`; the others are bound to outbound.

## Scan order

Receiving expects the pallet licence plate first, then the destination bin.
Scanning the bin first returns `Unexpected scan - expecting LPN` on the
handheld. That message is correct behaviour, not a defect.

## Seeded purchase orders

All are for SKU `WID-2200` (Widget 20mm), 120 units ordered, arriving as 10
pallet licence plates of 12 units each, labelled `LPN-<PO>-01` to
`LPN-<PO>-10`.

| PO       | State                    |
|----------|--------------------------|
| PO-88401 | received - closed        |
| PO-88402 | received - closed        |
| PO-88403 | received - closed        |
| PO-88404 | open                     |
| PO-88405 | open                     |
| PO-88406 | open                     |
| PO-88407 | open                     |
| PO-88408 | open                     |

Receiving against a PO closes it. A closed PO cannot be received again. The
pool is restored when staging is rebuilt, on the first Monday of the quarter.

## Receiving outcomes

| Situation                     | What happens                                        |
|-------------------------------|-----------------------------------------------------|
| Quantity received = ordered   | PO moves to `Received`; handheld shows `Receipt complete 120/120`. |
| Over ordered, within 5%       | Accepted; PO moves to `Received (over)`; handheld shows the received figure over the ordered figure. |
| Over ordered, above 5%        | Handheld shows `Over tolerance - supervisor override required`; nothing is received until a supervisor badge is scanned. Supervisor badge `S-4471` (T. Adeyemi). |
| Quantity received < ordered   | PO moves to `Partially received`; a discrepancy note is raised in the console under Receiving > Discrepancies. |

Destination bin for all receiving tests: `RCV-A-01`.
