# INC-1996 - warehouse-sync stopped for four days

- 2026-05-02 - host OOM-killer took `warehouse-sync` mid-run. No exit handler
  ran.
- 2026-05-02 .. 2026-05-06 - every subsequent invocation found the leftover lock
  file and exited immediately. No alert fired; the job simply did nothing.
- 2026-05-06 - noticed when a weekly report came back empty. Lock deleted by
  hand, job resumed.
- Action: a run that is killed must not cost us more than the cycle it died in.
  Analytics can absorb one missed cycle and their hourly feed covers the rest;
  four days of silence is what we are not doing again. Whatever we put in front
  of this job has to be back to normal service by the next invocation, without
  anybody logging in.
