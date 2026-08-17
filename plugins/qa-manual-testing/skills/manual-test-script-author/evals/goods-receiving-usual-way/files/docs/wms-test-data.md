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
