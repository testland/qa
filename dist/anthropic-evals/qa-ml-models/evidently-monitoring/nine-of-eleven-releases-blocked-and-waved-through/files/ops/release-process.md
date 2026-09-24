# churn-propensity release process (extract)

- Retrain runs on the first Monday of the month. A candidate is promoted only
  after a written promotion note signed off by the model owner.
- `data/reference_2026-05.parquet` was cut from the May promotion and has been
  the comparison baseline since. Cutting a new one is a manual step in the
  promotion checklist; it has been skipped at every promotion since May because
  nobody is sure whether it is safe to do while an incident is open.
- `data/candidate_eval.parquet` is the held-out evaluation slice for the
  candidate, built from production scoring rows over the four weeks before the
  candidate was cut.
- An override is recorded in `ops/override-log.md` with a one-line reason. There
  is no second approver.
