# qa-shift-right

Production-side QA — covers ISTQB-canonical shift-right ("a test approach to test a system continuously in production"). Synthetic monitors that exercise critical journeys against prod, canary-deploy validators that catch regressions before full rollout, A/B / feature-flag experiment statistical significance validators, and the workflow from "production caught a bug" to "we wrote the regression test that would have caught it earlier."

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| (filled in as components are added) | | | |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-shift-right@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework
(6 dimensions, including D6 terminology compliance). See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at the
repository root for the rubric.
