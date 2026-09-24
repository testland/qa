# Issue #488 - CI fails on every pull request from a fork

Opened 28 Aug 2026 by @kamil-w (not a member of this organisation)

> My PR #486 has failed on every push for two weeks and the log is identical
> every time. My branch touches `src/wave.mjs` and one test file. It does not go
> anywhere near publishing. Am I doing something wrong?

Log excerpt from the latest failure on #486:

```
  Run npm test
    ok 1 - parses seconds
    ok 2 - parses hours
    ok 3 - rejects nonsense
    ok 4 - formats the largest whole unit
    ok 5 - round-trips
  Run ./scripts/label-run.sh "fix: reject negative durations"
  Run ./scripts/report.sh
    report.sh: DASHBOARD_TOKEN is empty, refusing to post
    Error: Process completed with exit code 1
```

Two maintainers have confirmed the same PR passes when they push the identical
branch from a branch on this repository rather than from a fork.
