# INC-5503 - August close did not run

- 2026-09-01 01:40 UTC - node pool `pool-b` cordoned and drained for the 1.29.4
  patch. Pool back in service 02:05 UTC.
- 2026-09-01 02:00 UTC - `close-books` schedule time. No Job object was created.
  The controller logged that the start time had been missed.
- 2026-09-01 .. 2026-09-10 - nothing. The CronJob object itself looked healthy;
  its last successful run timestamp was simply the month before.
- 2026-09-10 - Accounting asked for the August close. Run by hand at 2026-09-10
  16:20 UTC, took 3h04m. Finance checked the figures line by line before
  accepting them and would not say why.
