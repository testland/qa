# image-scan, PR #4471 (checkout-api), 2026-09-09, run 18844021

Conclusion: failure. Wall clock 9m 41s.

## Where the time went

| Phase                      | Time   |
|----------------------------|--------|
| docker build               | 1m 12s |
| vulnerability DB download  | 3m 50s |
| vulnerability scan         |    41s |
| secret scan                |    12s |
| misconfiguration scan      | 1m 36s |
| license scan               | 2m 10s |

## What came back

| Class            | CRITICAL | HIGH | MEDIUM | LOW | total |
|------------------|----------|------|--------|-----|-------|
| vulnerability    |        6 |   31 |    188 |  97 |   322 |
| secret           |        0 |    0 |      0 |   0 |     0 |
| misconfiguration |        1 |    3 |      4 |   0 |     8 |
| license          |        0 |    2 |      8 |   0 |    10 |

Of the 322 vulnerability findings, 284 carry no fixed version in the report —
the distribution has not published a patched package. Of the 6 CRITICAL, 2 have
a fixed version. Of the 31 HIGH, 9 do.

The single CRITICAL misconfiguration is the same one flagged on every run since
June: the image runs as root. Ticket PLAT-2210, open.
