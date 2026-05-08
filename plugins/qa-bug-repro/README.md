# qa-bug-repro

Bug reproduction workflow: extracts bug reports from Playwright traces / HARs, builds minimal failing tests from issue reports, classifies crash stacks, clusters defects, and analyzes escape defects.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [bug-report-template](skills/bug-report-template/SKILL.md) | S3 | Build a triageable bug report from raw notes; flag gaps in environment / steps / expected / actual / severity / priority / reproducibility. |
| Agent | [bug-report-from-recording](agents/bug-report-from-recording.md) | A2 | Action-taking: read a Playwright `trace.zip` (or HAR + console + screenshot) and emit a filled `bug-report-template` with verbatim error messages, reconstructed repro steps, and trace-derived environment block. |
| Agent | [bug-repro-builder](agents/bug-repro-builder.md) | A2 | Action-taking: turn a bug report into a minimal failing test (unit / integration / component / e2e) or a minimal-repro repository. |
| Agent | [failure-classifier](agents/failure-classifier.md) | A1 | Read-only triager: take one failed test result + 7-day history + environment metadata; classify as `defect` / `flaky-pre-incident` / `flaky-known` / `environment-drift` / `timeout` / `flake-of-unknown-cause`; recommend the next agent. |
| Agent | [crash-stack-trace-analyzer](agents/crash-stack-trace-analyzer.md) | A1 | Parse V8 / Python / JVM / Go / native / minified traces; locate top app frame; `git blame` to attribute; emit hypothesis. |
| Agent | [defect-clusterer](agents/defect-clusterer.md) | A1 | Group a backlog of bug reports by fingerprint (top-frame, error+route, error alone) into root-cause clusters; flag weak-signal clusters for human review. |
| Agent | [escape-defect-analyzer](agents/escape-defect-analyzer.md) | A4 | Builder: classify a production-found bug as test-gap / process-gap / tooling-gap; generate a prevention-asset report with concrete test or monitoring change. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-bug-repro@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at the
repository root for the rubric.
