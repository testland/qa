# Anti-patterns - feature-flag-experiment-validator

Each row maps a common analysis mistake to the step that prevents it.

| Anti-pattern                                                              | Why it fails                                                                | Fix |
|---------------------------------------------------------------------------|-----------------------------------------------------------------------------|-----|
| Peeking and stopping at first significance                                | Inflates false-positive rate dramatically.                                 | Pre-register stop date OR use sequential testing (Step 7). |
| Single metric only                                                         | Misses regressions in secondary metrics (revenue down even though completion up). | 5-10 metrics including guardrails (Step 1). |
| No multiple-comparisons correction                                         | 10 metrics × α=0.05 = 40% chance of false positive somewhere.              | FDR / Bonferroni (Step 3). |
| Ship based on practical significance without statistical                  | Random variance gets shipped as "lift."                                    | Both required (Step 5). |
| Ship based on statistical significance without practical                  | 0.1% lift at N=10M ships; not worth maintenance burden.                    | MDE per metric (Step 5). |
| Welch's t-test on heavy-tailed metrics (revenue)                          | Test invalid; conclusion wrong.                                            | Mann-Whitney U for non-normal metrics (Step 2). |
| Ignoring guardrail metrics (support tickets, churn, refund rate)          | Ship something that breaks downstream.                                    | Always include guardrails (Step 6 example). |
