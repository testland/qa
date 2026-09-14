# SignupSimulation - nightly, 2026-09-11, steady-state window (720s)

| Request         | Count  | Mean (ms) | p50  | p95  | p99  | KO    |
|-----------------|--------|-----------|------|------|------|-------|
| Get token       | 84,402 | 1384      | 1102 | 3488 | 5902 | 0.11% |
| Create merchant | 84,388 | 1620      | 1290 | 4106 | 7214 | 0.24% |
| Submit KYC      | 84,201 | 1002      |  844 | 2611 | 4402 | 0.41% |

Global: 252,991 requests in 720 s, mean 1336 ms, KO 0.25%.
Active users held at 500 for the whole window.

Assertions:

```
global failedRequests percent < 1.0 : OK
```

Build result: SUCCESS.
