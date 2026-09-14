# Per-assertion outcomes, perf job, 2025-07-09 through 2026-09-11

2,311 runs.

| Assertion in the config    | Runs where it failed | Last failure | Notes |
|----------------------------|----------------------|--------------|-------|
| `first-contentful-paint`   | 2                    | 2026-02-03   | Both from the same PR that inlined a 900 kB hero. |
| `largest-contentful-paint` | 13                   | 2026-08-27   | Reverted or fixed each time. |
| `cumulative-layout-shift`  | 4                    | 2026-06-14   | Three were the cover-image placeholder. |
| `first-input-delay`        | 0                    | never        | |
