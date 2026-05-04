# qa-bug-repro

Bug reproduction workflow: extracts minimal failing tests from issue reports, classifies crash stacks, clusters defects, and analyzes escape defects.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | [bug-report-template](skills/bug-report-template/SKILL.md) | S3 | Build a triageable bug report from raw notes; flag gaps in environment / steps / expected / actual / severity / priority / reproducibility. |
| agent | [bug-repro-builder](agents/bug-repro-builder.md) | A2 | Action-taking: turn a bug report into a minimal failing test (unit / integration / component / e2e) or a minimal-repro repository. |
| agent | [crash-stack-trace-analyzer](agents/crash-stack-trace-analyzer.md) | A1 | Parse V8 / Python / JVM / Go / native / minified traces; locate top app frame; `git blame` to attribute; emit hypothesis. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-bug-repro@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework
(6 dimensions, including D6 terminology compliance). See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at the
repository root for the rubric.
