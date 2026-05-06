# qa-bug-repro

Bug reproduction workflow: extracts minimal failing tests from issue reports, classifies crash stacks, clusters defects, and analyzes escape defects.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | [bug-report-template](skills/bug-report-template/SKILL.md) | S3 | Build a triageable bug report from raw notes; flag gaps in environment / steps / expected / actual / severity / priority / reproducibility. |
| agent | [bug-repro-builder](agents/bug-repro-builder.md) | A2 | Action-taking: turn a bug report into a minimal failing test (unit / integration / component / e2e) or a minimal-repro repository. |
| agent | [crash-stack-trace-analyzer](agents/crash-stack-trace-analyzer.md) | A1 | Parse V8 / Python / JVM / Go / native / minified traces; locate top app frame; `git blame` to attribute; emit hypothesis. |
| agent | [defect-clusterer](agents/defect-clusterer.md) | A1 | Group a backlog of bug reports by fingerprint (top-frame, error+route, error alone) into root-cause clusters; flag weak-signal clusters for human review. |
| agent | [escape-defect-analyzer](agents/escape-defect-analyzer.md) | A4 | Builder: classify a production-found bug as test-gap / process-gap / tooling-gap; generate a prevention-asset report with concrete test or monitoring change. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-bug-repro@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at the
repository root for the rubric.
