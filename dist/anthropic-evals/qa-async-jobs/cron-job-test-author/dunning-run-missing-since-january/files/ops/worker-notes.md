# billing-worker on bw-03

- The worker plans every entry in `src/schedules.js` when it boots and logs the
  first upcoming run for each. Boot logs roll at seven days and nobody reads
  them.
- `src/cron.js` is vendored from the platform monorepo into eleven services.
  Frozen until the Q4 change window.
- Host move to bw-07 scheduled 2026-10-05.
- `npm test` has been green on every weekly run since April.
- The registry is the only place a schedule is configured. There is no crontab
  on the host and no scheduler in front of the worker.
