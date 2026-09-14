# Drift gate history

| Candidate | Date       | Gate output       | Job result | Notes                          |
|-----------|------------|-------------------|------------|--------------------------------|
| rc-1.0.0  | 2026-02-10 | drift gate: passed| green      | first run                      |
| rc-1.0.1  | 2026-02-24 | drift gate: passed| green      |                                |
| ...       | ...        | drift gate: passed| green      | 36 further candidates          |
| rc-1.3.7  | 2026-08-12 | drift gate: passed| green      |                                |
| rc-1.3.8  | 2026-08-19 | drift gate: passed| green      | vendor encoding change shipped |
| rc-1.3.9  | 2026-08-26 | drift gate: passed| green      | precision already at 0.55      |
| rc-1.4.0  | 2026-09-02 | drift gate: passed| green      | after the rollback             |

41 candidates, 0 blocks, 0 red jobs.

Manual re-run on 2026-09-11 of `rc-1.3.8` against the 2026-08-18..2026-08-27
production extract (`/tmp/prod_week.parquet`, 214k rows): `drift gate: passed`.

`drift_report.html` from that run shows `employment_status` and
`months_at_address` plainly shifted when you open it by eye.
