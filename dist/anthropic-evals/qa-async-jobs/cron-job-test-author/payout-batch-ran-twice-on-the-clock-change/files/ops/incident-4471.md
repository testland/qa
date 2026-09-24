# INC-4471 - payout posted twice

- 2025-11-02 05:30 UTC - `payout-reconcile` ran and posted batch 88214.
- 2025-11-02 06:30 UTC - `payout-reconcile` ran again and posted an identical
  batch, 88215. The ledger took both; nothing in the batch is keyed on the
  period it covers.
- 2025-11-03 - Finance reconciled and found the day out by one day's volume.
  Batch 88215 reversed by hand, 4h of two people's time.
- No deploy that weekend. Config unchanged since March 2025. Host metrics for
  the whole night are normal; both runs completed cleanly.
- Nothing was recorded about the other three jobs. Nobody looked at them.
