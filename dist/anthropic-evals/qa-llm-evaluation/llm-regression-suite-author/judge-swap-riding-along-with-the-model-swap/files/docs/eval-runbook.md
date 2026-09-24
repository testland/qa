# Contract assistant eval — how a run is produced

- `scripts/run-eval.mjs` reads `eval/regression.config.json`, resolves the model
  names against the provider, and records the resolved snapshot ids in the
  result file under `modelUnderTest` and `grader`.
- Assertion types listed in `grader.assertionTypes` are scored by the grading
  model on a 0-1 scale. The run records the raw `score` for each of those cases
  alongside the pass/fail it derived from `grader.passScore`.
- All other assertion types are evaluated locally and record no score.
- `gate.minRetainedRatio` is applied to the overall pass rate of the run against
  the overall pass rate of the file named in `gate.compareTo`.
- Dataset `golden-v6.1.0.jsonl` has been current since 2026-08-22 and has not
  been edited since.
