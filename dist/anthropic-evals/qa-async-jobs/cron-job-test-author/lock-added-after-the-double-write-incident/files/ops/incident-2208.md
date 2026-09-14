# INC-2208 - duplicate rows in fact_orders

- 2026-07-21 09:40 - analytics reports order counts roughly double for the
  overnight window.
- 2026-07-21 11:05 - confirmed 4,163 rows written twice. Two `warehouse-sync`
  processes were alive at the same time for part of the night; both wrote.
- 2026-07-21 14:20 - job paused in crontab pending a fix.
- Cause recorded as: no protection against a run starting while the previous
  one is still going. The job has no idempotency on write; it appends.
- Action: Priya to add a lock. Done 2026-07-28, not yet exercised in anger
  because the job has been paused since.
