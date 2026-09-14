# Handover - warehouse-sync lock, priya, 2026-07-28

Both failure modes are covered.

`acquire()` creates the lock file exclusively, so a second run gets `false` back
and `runSync` exits without doing any work - that is INC-2208. A lock that is
older than `STALE_AFTER_MS` is treated as abandoned, deleted and re-taken, so a
run that is killed cannot stop the schedule the way INC-1996 did. The pid of the
holder goes into the file in case anyone needs to know who has it.

Both paths have tests in `test/lock.test.js`. As far as I am concerned this is
finished and the crontab lines can be uncommented whenever analytics want them.
