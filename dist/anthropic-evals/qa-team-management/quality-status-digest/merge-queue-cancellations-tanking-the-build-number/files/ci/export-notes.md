# CI run export - field notes

One row per date and workflow. The four count columns are terminal conclusions
reported by the API for runs that finished inside the window.

Workflow values currently emitted for this repository:

- `ci` - the pipeline that runs on a push to any branch and on the nightly
  schedule.
- `ci-merge-queue` - the same pipeline definition, run against each merge
  candidate the queue assembles. Emitting since 2026-09-08. A candidate evicted
  because an earlier entry in its batch failed is reported as `cancelled`; a
  candidate dropped because the queue rebuilt the batch around a newer commit is
  reported as `skipped`.

Historic rows are not rewritten when a new workflow starts emitting.
