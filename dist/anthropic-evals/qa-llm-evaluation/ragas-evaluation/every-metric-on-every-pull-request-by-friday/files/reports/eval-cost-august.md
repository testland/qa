# Eval spend, August 2026

Current PR job: 4 metrics, 200 rows sampled from the 3,140-row golden set.

| Figure                                   | Value        |
|------------------------------------------|--------------|
| Judge calls per metric per row (measured) | 1.9 average  |
| Wall time, PR job                         | 9 min 20 s   |
| Judge spend, one PR job                   | $18.40       |
| PR jobs in August                         | 240          |
| Judge spend on PR jobs, August            | $4,416       |
| Nightly job, same 4 metrics, 200 rows     | $18.40 x 30  |
| Team budget for assistant evals, monthly  | $6,000       |

Of the thirty-four metrics in the catalog, three compute without a judge call
at all (string-distance and exact-match style). The rest call a judge; a few
call it more than twice per row.
