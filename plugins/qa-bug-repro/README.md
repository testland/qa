# qa-bug-repro

Bug reproduction workflow: extracts bug reports from Playwright traces / HARs, builds minimal failing tests from issue reports, classifies crash stacks, clusters defects, and analyzes escape defects.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [bug-report-template](skills/bug-report-template/SKILL.md) | S3 | Build a triageable bug report from raw notes; flag gaps in environment / steps / expected / actual / severity / priority / reproducibility. |
| Agent | [bug-report-from-recording](agents/bug-report-from-recording.md) | A2 | Action-taking: read a Playwright `trace.zip` (or HAR + console + screenshot) and emit a filled `bug-report-template` with verbatim error messages, reconstructed repro steps, and trace-derived environment block. |
| Agent | [bug-repro-builder](agents/bug-repro-builder.md) | A2 | Action-taking: turn a bug report into a minimal failing test (unit / integration / component / e2e) or a minimal-repro repository. |
| Agent | [failure-classifier](agents/failure-classifier.md) | A1 | Read-only triager: take one failed test result + 7-day history + environment metadata; classify as `defect` / `flaky-pre-incident` / `flaky-known` / `environment-drift` / `timeout` / `flake-of-unknown-cause`; recommend the next agent. |
| Agent | [defect-trend-narrator](agents/defect-trend-narrator.md) | A1 | Read-only narrator: take a time-windowed defect set, compute Pareto distribution + week-over-week deltas + escape-rate, emit a manager-facing trend narrative with citation appendix. |
| Agent | [crash-stack-trace-analyzer](agents/crash-stack-trace-analyzer.md) | A1 | Parse V8 / Python / JVM / Go / native / minified traces; locate top app frame; `git blame` to attribute; emit hypothesis. |
| Agent | [defect-clusterer](agents/defect-clusterer.md) | A1 | Group a backlog of bug reports by fingerprint (top-frame, error+route, error alone) into root-cause clusters; flag weak-signal clusters for human review. |
| Agent | [escape-defect-analyzer](agents/escape-defect-analyzer.md) | A4 | Builder: classify a production-found bug as test-gap / process-gap / tooling-gap; generate a prevention-asset report with concrete test or monitoring change. |
| Agent | [test-failure-debugger](agents/test-failure-debugger.md) | A1 | Read-only diagnoser for a consistently-failing test: reads stderr + diff against last-known-good baseline, classifies failure mode (assertion mismatch / setup error / environmental / selector breakage / timing-logic), proposes one minimal fix. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-bug-repro@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.
