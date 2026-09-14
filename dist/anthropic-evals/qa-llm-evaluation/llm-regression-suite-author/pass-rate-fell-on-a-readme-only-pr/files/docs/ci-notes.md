# How eval runs are stored

- The workflow uploads the raw per-case result JSON to the CI artifact store.
  Org-wide artifact retention is 30 days; nothing older is recoverable.
- After each run a step appends one row to `results/history.csv` and one line to
  `results/run-metadata.jsonl`. Those two files are committed, so they are the
  only record that survives past 30 days.
- Per-case detail therefore exists only for runs from 2026-08-14 onward.
- The dataset file is committed and tagged. `golden-v2.3.0.jsonl` has been the
  current dataset since 2026-07-30 and is unchanged since.
- The runner resolves every model name it is given against the provider and
  records both what was requested and what was resolved.
