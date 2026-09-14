# Last night's run — slowest 10 samplers by p95

| Sampler                        | Area      | Samples | Error % | p95 (ms) | p99 (ms) |
|--------------------------------|-----------|---------|---------|----------|----------|
| GET /reporting/export          | reporting | 1,204   | 0.00    | 31,402   | 38,910   |
| GET /reporting/ledger          | reporting | 1,198   | 0.00    |  6,402   |  7,880   |
| GET /admin/audit-log           | admin     | 2,410   | 0.00    |  4,918   |  5,602   |
| POST /checkout/pay             | checkout  | 8,802   | 0.00    |  2,904   |  3,410   |
| GET /admin/users               | admin     | 2,388   | 0.00    |  2,118   |  2,640   |
| GET /search/facets             | search    | 9,140   | 0.00    |  1,902   |  2,244   |
| POST /checkout/cart            | checkout  | 8,811   | 0.00    |  1,486   |  1,802   |
| GET /search                    | search    | 9,204   | 0.00    |  1,102   |  1,380   |
| POST /auth/token               | auth      | 4,402   | 0.00    |    812   |    998   |
| GET /checkout/methods          | checkout  | 8,790   | 0.00    |    602   |    741   |

Zero errored samples in the run.

Gate verdict: FAIL — `GET /reporting/export` p95 31402 ms exceeds 8000 ms;
`GET /admin/audit-log` p95 4918 ms exceeds 4000 ms.
