# Handover - warehouse-sync lock, priya, 2026-07-28

The lock is in. `acquire()` creates the file exclusively, so a second run gets
`false` back and `runSync` exits without doing any work. A lock older than
`STALE_AFTER_MS` is treated as abandoned, deleted and re-taken, so a killed run
cannot stop the schedule the way INC-1996 did. Both paths have tests.

The one thing I did not settle is `STALE_AFTER_MS`. I put 60s in so I could get
the tests written and never went back to it with the runtime numbers in front of
me. Pick a value off `ops/sync-runtimes.txt` before the job goes back on and I
think this is done.
