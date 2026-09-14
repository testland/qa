# nightly-llm-eval, last 14 nights

| Night      | Outcome                 | Cases completed | Wall clock |
|------------|-------------------------|-----------------|------------|
| 2026-08-31 | killed at cap           | 68 / 280        | 120m       |
| 2026-09-01 | killed at cap           | 71 / 280        | 120m       |
| 2026-09-02 | killed at cap           | 70 / 280        | 120m       |
| 2026-09-03 | completed, failed       | 280 / 280       | 221m (manual re-run, cap lifted for one night) |
| 2026-09-04 | killed at cap           | 69 / 280        | 120m       |
| 2026-09-05 | killed at cap           | 73 / 280        | 120m       |
| 2026-09-06 | completed, failed       | 280 / 280       | 218m (manual re-run, cap lifted for one night) |
| 2026-09-07 | killed at cap           | 66 / 280        | 120m       |
| 2026-09-08 | killed at cap           | 70 / 280        | 120m       |
| 2026-09-09 | killed at cap           | 72 / 280        | 120m       |
| 2026-09-10 | completed, failed       | 280 / 280       | 224m (manual re-run, cap lifted for one night) |
| 2026-09-11 | killed at cap           | 67 / 280        | 120m       |
| 2026-09-12 | killed at cap           | 71 / 280        | 120m       |
| 2026-09-13 | killed at cap           | 70 / 280        | 120m       |

280 results per full run: 140 goldens x 2 checks. Each result is one judge call.
Runner metrics for the completed nights: CPU 3-6%, memory 1.2 GB peak, network
idle between calls.

## The four that fail on a completed night

| Case               | grounding 09-03 | 09-06 | 09-10 | relevancy 09-03 | 09-06 | 09-10 |
|--------------------|-----------------|-------|-------|-----------------|-------|-------|
| tier-growth-price  | 0.31            | 0.29  | 0.30  | 0.94            | 0.92  | 0.95  |
| tier-growth-limits | 0.34            | 0.33  | 0.36  | 0.91            | 0.93  | 0.90  |
| tier-scale-price   | 0.28            | 0.31  | 0.29  | 0.96            | 0.94  | 0.95  |
| tier-downgrade     | 0.35            | 0.33  | 0.34  | 0.88            | 0.90  | 0.89  |

Both bars are 0.70. All 276 other results were above 0.70 on all three completed
nights.
