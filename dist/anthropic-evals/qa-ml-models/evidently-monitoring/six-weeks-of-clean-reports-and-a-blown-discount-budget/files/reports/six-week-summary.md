# quote-accept, 2026-07-20 to 2026-08-30

Nightly run against pinned snapshot `ref_2026-06-01_to_2026-06-28`, 22 monitored
columns:

| Week starting | Nights run | Max columns over threshold (of 22) | Nights notified |
|---------------|-----------|------------------------------------|-----------------|
| 2026-07-20    | 7         | 1                                  | 0               |
| 2026-07-27    | 7         | 0                                  | 0               |
| 2026-08-03    | 7         | 1                                  | 0               |
| 2026-08-10    | 7         | 2                                  | 0               |
| 2026-08-17    | 7         | 1                                  | 0               |
| 2026-08-24    | 7         | 1                                  | 0               |

Business and model numbers over the same period, from the warehouse
(`label` is backfilled through 2026-08-16; the rest is complete):

| Week starting | Quotes  | Share scored below 0.5 | Discount spend vs plan | Realised acceptance rate | Mean quoted premium |
|---------------|---------|------------------------|------------------------|--------------------------|---------------------|
| 2026-07-20    | 184,102 | 18.1%                  | 0.98x                  | 63.9%                    | GBP 612             |
| 2026-07-27    | 179,884 | 17.9%                  | 1.01x                  | 64.1%                    | GBP 609             |
| 2026-08-03    | 181,551 | 36.8%                  | 2.24x                  | 63.6%                    | GBP 611             |
| 2026-08-10    | 186,207 | 37.4%                  | 2.31x                  | 63.4%                    | GBP 614             |
| 2026-08-17    | 180,330 | 37.1%                  | 2.28x                  | 63.5%                    | GBP 610             |
| 2026-08-24    | 183,776 | 37.6%                  | 2.34x                  | (pending)                | GBP 613             |

Feature means are flat across the whole window; the largest weekly change in any
of the 21 input columns is `competitor_price_index` at +1.2%.
