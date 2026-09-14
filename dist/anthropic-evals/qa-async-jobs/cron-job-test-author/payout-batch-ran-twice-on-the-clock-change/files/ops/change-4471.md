# Change note 2026-09-04 - marek

Picked up INC-4471 ahead of the 1 November clock change.

Before this change both finance jobs carried:

    payout-reconcile   hour 1  minute 30   timeZone America/New_York
    ledger-close       hour 2  minute 15   timeZone America/New_York

After:

    payout-reconcile   hour 1  minute 30   timeZone EST
    ledger-close       hour 2  minute 15   timeZone Etc/GMT+5

Rationale: the ledger runs on New York time and New York is five hours behind
UTC, so I pinned both jobs to that instead of leaving them on a zone that shifts
underneath us. Added `payout-reconcile runs once on the November clock change`
to `test/scheduler.test.js`; it passes, so the duplicate cannot happen again.

Not touched: eu-vat-export, metrics-rollup.
