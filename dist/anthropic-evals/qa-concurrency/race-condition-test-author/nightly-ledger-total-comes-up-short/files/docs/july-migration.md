# Ingest on worker threads — July 2026

Before: a single ingest loop on the main thread, ~9,000 postings/second,
close finished at 04:40.

After: four `node:worker_threads` ingest threads over one `SharedArrayBuffer`,
~31,000 postings/second, close finishes at 03:05. Eight threads during
catch-up after an outage.

Nothing else in the close path changed. The ledger service was last deployed
in April.

## Reconciliation results since the migration

| Night | Expected postings | Tally reported | Delta |
|---|---|---|---|
| 08-26 | 3,104,882 | 3,104,882 | 0 |
| 08-27 | 2,981,044 | 2,981,044 | 0 |
| 09-01 | 3,220,119 | 3,218,707 | -1,412 |
| 09-02 | 3,190,556 | 3,190,556 | 0 |
| 09-04 | 3,088,901 | 3,088,895 | -6 |
| 09-08 | 3,402,733 | 3,402,733 | 0 |

Deltas are always negative. Catch-up nights (eight threads) are
over-represented among the bad ones.
