# qa-flake-triage

Flake triage workflow: bisector, parallel-isolation checker, regression bisector, AI-pattern flake detector, trend reporter, and quarantine workflow.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | [flaky-test-quarantine](skills/flaky-test-quarantine/SKILL.md) | S3 | Quarantine workflow: mark, annotate (rate + bisect link + expiry), auto-expiry report, two-renewal cap. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-flake-triage@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework
(6 dimensions, including D6 terminology compliance). See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at the
repository root for the rubric.
