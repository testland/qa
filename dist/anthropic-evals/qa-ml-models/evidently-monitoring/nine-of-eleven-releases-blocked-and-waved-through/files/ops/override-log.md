# churn-propensity pre-deploy check, June to September 2026

| RC        | Date       | Result  | Columns that failed                                      | Overridden by | Note                                            |
|-----------|------------|---------|----------------------------------------------------------|---------------|-------------------------------------------------|
| rc-6.1.0  | 2026-06-09 | BLOCKED | request_id, session_uuid, etl_batch_id                   | @marek        | ids are random, obviously                        |
| rc-6.1.1  | 2026-06-23 | BLOCKED | ingested_at, scored_at, last_sync_at                     | @marek        | timestamps move, it is a new month               |
| rc-6.2.0  | 2026-07-07 | passed  | -                                                        | -             |                                                  |
| rc-6.2.1  | 2026-07-14 | BLOCKED | raw_user_agent, support_note                             | @pchen        | browser versions rolled, free text is free text  |
| rc-6.2.2  | 2026-07-21 | BLOCKED | request_id, session_uuid, record_checksum, etl_batch_id  | @marek        | same as last time                                |
| rc-6.3.0  | 2026-07-28 | BLOCKED | ingested_at, scored_at                                   | @pchen        | timestamps                                       |
| rc-6.3.1  | 2026-08-04 | BLOCKED | raw_user_agent, source_region, billing_system_version    | @marek        | billing upgrade, expected                        |
| rc-6.3.2  | 2026-08-11 | BLOCKED | request_id, session_uuid                                 | @pchen        | ids                                              |
| rc-6.4.0  | 2026-08-21 | BLOCKED | tenure_months, monthly_charges, discount_pct, churn_score| @marek        | overridden in 4 min; see incident INC-2211       |
| rc-6.4.1  | 2026-09-01 | BLOCKED | ingested_at, scored_at, last_sync_at, etl_batch_id       | @pchen        | timestamps                                       |
| rc-6.5.0  | 2026-09-08 | passed  | -                                                        | -             |                                                  |

Every run since 2026-06-23 has also printed the stale-reference warning. It read
`123 days old` on the last run.

INC-2211: rc-6.4.0 shipped 2026-08-21. AUC on the weekly holdout fell from 0.812
to 0.779 between 2026-08-22 and 2026-08-28. Root cause was a change in how the
CRM writes `discount_pct` for annual contracts, first present in warehouse rows
from 2026-08-06 onward, which pushed `churn_score` down across the whole
annual-contract segment. Rolled back 2026-08-29.
