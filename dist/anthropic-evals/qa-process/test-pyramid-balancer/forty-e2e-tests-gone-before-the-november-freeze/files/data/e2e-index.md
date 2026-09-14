# remit - the 78 end-to-end tests, grouped

Grouped by @tobi-r in 2025-10. Groupings re-walked 2026-09-02 and still correct.

## Group A - cross-service boundaries (31 tests)

These drive two or more services and assert what one sends and the other
accepts. Nothing below them covers the boundary; the middle layer has 9 tests
in it and all 9 are in the payouts service.

| Tests | Boundary                                        |
|------:|-------------------------------------------------|
|     8 | ledger to settlement (amounts, currency exponent, idempotency key) |
|     6 | settlement to payout-rail (batch boundary, cut-off)  |
|     5 | webhook ingress to ledger (replay, ordering)         |
|     5 | fx-service to ledger (rate staleness, rounding)      |
|     4 | dispute service to ledger (reversal, partial)        |
|     3 | statement builder to ledger (period boundary)        |

## Group B - duplicates an existing unit assertion (22 tests)

Each of these asserts something with an identical assertion already present in
`test/unit/`. Retiring them loses nothing.

Card BIN table lookup (4), currency symbol rendering (3), fee percentage maths
(4), IBAN format validation (3), date-window helpers (3), receipt line
formatting (3), sort order of statement rows (2).

## Group C - hero journeys (25 tests)

One test per critical customer journey, end to end through the real product:
checkout, refund, partial refund, payout, payout failure, dispute open, dispute
resolve, statement download, and seventeen more in the same shape. These are
the ones the on-call engineer runs by hand against staging before a release.
