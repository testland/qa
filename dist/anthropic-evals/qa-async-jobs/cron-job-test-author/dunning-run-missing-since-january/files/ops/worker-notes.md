# billing-worker on bw-03

- The worker plans every entry in `src/schedules.js` when it boots. An entry it
  cannot plan - the runner rejects it, or it has no upcoming run - is logged once
  at warn and dropped, and the worker carries on with the rest. Boot logs roll at
  seven days and nobody reads them.
- `src/cron.js` is vendored from the platform monorepo into eleven services.
  Frozen until the Q4 change window.
- Host move to bw-07 scheduled 2026-10-05.
- `npm test` has been green on every weekly run since April.
