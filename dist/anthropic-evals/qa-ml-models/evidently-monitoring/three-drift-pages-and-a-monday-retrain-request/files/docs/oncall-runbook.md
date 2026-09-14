# pagavia-fraud-scorer on-call runbook (extract)

## Data

- Warehouse holds all history. First transaction 2026-03-02.
- The pinned reference is cut at promotion and never edited in place. The
  current one is `ref_2026-08-03_to_2026-08-30`, promoted with v11 on 2026-08-31.

## Alert configuration

- Thresholds and suppressions live in `monitoring/alert_rules.py` and ship by
  PR. Nothing is muted by editing the job.
- A suppression needs an expiry date and a reference to a runbook entry or an
  incident.

## Quarantining scores

- Scores produced in a window can be flagged for manual review by filing the
  window (UTC, inclusive start, exclusive end) with risk-ops. This is the only
  mechanism; there is no automatic quarantine.

## Known recurring deviations

- **Monthly salary run.** `payroll_window_flag` and `cardholder_segment` move
  for roughly 36 hours around the 6th to 8th of each month. Recorded and closed
  on 2026-04-07, 2026-05-07, 2026-06-06, 2026-07-07 and 2026-08-06. Each time,
  volumes, decline rates and downstream fraud rates were normal throughout, and
  the distributions returned to the reference within two days.
- **Weekend e-commerce mix.** `is_ecommerce` runs 3-4 points higher on Saturday
  and Sunday. Recorded every weekend since May; inside threshold, has never
  fired.
