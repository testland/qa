# Runbook retrieval - embedding model swap

`minilm-l6-v1` -> `gte-small-v2`, re-embedded the whole catalogue Saturday
2026-09-12. 2.1M chunks, nine hours of GPU. `data/` holds the 96-chunk sample
the weekly harness runs on, pulled from the catalogue in June.

## Weekly harness

| Run date   | recall@10 | comparisons/query | p95 search (prod) |
|------------|-----------|-------------------|-------------------|
| 2026-08-22 | 0.975     | 48.1              | 18 ms             |
| 2026-08-29 | 0.968     | 48.0              | 19 ms             |
| 2026-09-05 | 0.968     | 48.0              | 19 ms             |
| 2026-09-12 | 0.375     | 82.1              | 38 ms             |

The 2026-09-12 run is the first one after the swap. Nothing else shipped that
weekend; the deploy freeze was on from Friday 18:00.

## Where this is

- Ops lead wants the previous model back on Monday. Another nine hours of GPU
  and we lose the week.
- The retrieval team's read is that `gte-small-v2` is simply worse on our
  domain and the benchmark numbers that sold it were on public datasets.
- Nobody has re-run the harness since Saturday.
