# Failing row counts, kept by hand by @pavla

Blank means the assertion passed that night.

| Night      | delivered_at nulls | session_id dupes | account_id orphans |
|------------|--------------------|------------------|--------------------|
| 2026-08-30 | 13,902             | 1,041            | 206                |
| 2026-08-31 | 14,410             |                  | 211                |
| 2026-09-01 | 13,788             | 987              | 208                |
| 2026-09-02 | 14,004             | 1,220            | 212                |
| 2026-09-03 | 14,251             | 903              | 209                |
| 2026-09-04 | 13,660             | 1,158            | 214                |
| 2026-09-05 | 14,402             |                  | 207                |
| 2026-09-06 | 12,988             | 1,301            | 205                |
| 2026-09-07 | 12,740             | 1,012            | 209                |
| 2026-09-08 | 14,118             | 1,190            | 213                |
| 2026-09-09 | 14,377             | 944              | 210                |
| 2026-09-10 | 13,955             | 1,077            | 212                |
| 2026-09-11 | 14,208             |                  | 214                |
| 2026-09-12 | 14,118             | 1,104            | 209                |

Total shipments in `fct_shipments` last night: 1,855,325.
Total sessions in `stg_web_sessions` last night: 4,118,004.
Total orders in `fct_orders` last night: 2,244,891.
