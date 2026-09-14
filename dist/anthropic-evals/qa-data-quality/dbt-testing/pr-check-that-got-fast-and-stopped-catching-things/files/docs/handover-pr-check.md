# PR check rework — handover

June 2026. @tcorbett (contract, ended 2026-06-27).

Before: `dbt build` on every pull request. 41 min p50, 58 min p90. People were
merging without waiting for it, which is worse than not having it.

After: 88 s p50 across the 40 pull requests I trialled it on.

Three changes:

1. Build only what the pull request changed, measured against the graph snapshot
   published by the check itself. No second job to maintain, no bucket, no
   credentials.
2. Dry-run mode, so the check never queues behind the nightly for warehouse
   slots.
3. Artifact retention cut from 14 days to 3. Nobody was opening them.

No false failures and no timeouts in the trial. One thing I did not get to: the
snapshot download occasionally 404s when nothing has published one recently, so I
left the check with a fallback path rather than have it hard-fail on people.
