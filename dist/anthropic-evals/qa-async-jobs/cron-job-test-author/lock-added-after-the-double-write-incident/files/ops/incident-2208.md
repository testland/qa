# INC-2208 - duplicate rows in fact_orders

- 2026-07-21 09:40 - analytics reports order counts roughly double for the
  overnight window.
- 2026-07-21 11:05 - confirmed 4,163 rows written twice. Two `warehouse-sync`
  processes were alive at the same time for part of the night and both wrote.
  The warehouse session log for 00:40-01:20 has the two writers connected from
  10.4.2.12 and 10.4.2.15.
- 2026-07-21 14:20 - job commented out of the crontab pending a fix.
- Cause recorded as: no protection against a run starting while another one is
  still going. The job has no idempotency on write; it appends.
- Action: Priya to add a lock. Done 2026-07-28, not exercised in anger because
  the job has been off since.
