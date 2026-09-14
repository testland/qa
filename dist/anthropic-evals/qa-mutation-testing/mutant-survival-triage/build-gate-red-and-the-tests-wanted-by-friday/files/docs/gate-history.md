# shipping-rules mutation gate

| Run | Date | Killed / total | Score | Gate |
|---|---|---:|---:|---|
| mut-0824 | 2026-08-24 | 39/39 | 100.0% | green |
| mut-0831 | 2026-08-31 | 39/39 | 100.0% | green |
| mut-0907 | 2026-09-07 | 38/42 | 90.5% | red |
| mut-0909 | 2026-09-09 | 38/42 | 90.5% | red |

The three new mutants in the 42 come from the rating rewrite on the 7th, which
added the express branch and the discount line. `mutmut` has been pinned at
2.4.5 across all four runs and the runner command has not changed.
