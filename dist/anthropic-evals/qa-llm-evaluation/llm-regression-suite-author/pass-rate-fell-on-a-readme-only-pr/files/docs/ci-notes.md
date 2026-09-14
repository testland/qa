# How eval runs are stored

- The workflow uploads the raw per-case result JSON to the CI artifact store.
  Org-wide artifact retention is 30 days; nothing older is recoverable.
- After each run a step appends one row to `results/history.csv` and one line to
  `results/run-metadata.jsonl`. Those two files are committed, so they are the
  only record that survives past 30 days.
- The `pass_rate` column is the fraction of the dataset's cases that passed.
- The runner resolves every model name it is given against the provider and
  records both what it asked for and what came back.
- The runner also records the dataset file it read, the SHA-256 of that file's
  contents, and how many cases it parsed out of it.
- `gate.minPassRate` is applied to the run's own pass rate. No baseline is
  stored anywhere.
