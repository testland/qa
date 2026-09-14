# INC-1996 - warehouse-sync stopped for four days

- 2026-05-02 - host OOM-killer took `warehouse-sync` mid-run. No exit handler
  ran.
- 2026-05-02 .. 2026-05-06 - every subsequent invocation found the leftover
  lock file and exited immediately. No alert fired; the job simply did nothing.
- 2026-05-06 - noticed when a weekly report came back empty. Lock deleted by
  hand, job resumed.
- Action: any lock we keep has to recover by itself from this. A run that is
  killed must not be able to stop the schedule permanently.
