# CI run export - field notes

One row per date and workflow. The four count columns are terminal conclusions
reported by the API for runs that finished inside the window.

Workflow values currently emitted for this repository:

- `ci` - the pipeline that runs on a push to any branch and on the nightly
  schedule.
- `ci-merge-queue` - the same pipeline definition, against the same test suite,
  run on each merge candidate the queue assembles out of this repository's own
  pull requests. Emitting since 2026-09-08. `failure` on these rows means the
  suite failed on the candidate; the candidate is rejected and its author is
  notified. A candidate evicted because an earlier entry in its batch failed is
  reported as `cancelled`, and a candidate dropped because the queue rebuilt the
  batch around a newer commit is reported as `skipped`; neither of those two ran
  to a verdict on the code.

Historic rows are not rewritten when a new workflow starts emitting, so windows
before 2026-09-08 carry `ci` rows only.
