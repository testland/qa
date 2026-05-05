# qa-roles

Sharply-scoped QA role agents — each one ships a **specific task** for the role, not a job-title persona. The marketplace's lint rules reject `qa-expert` / `quality-engineer` / `qa-master` style names; this plugin demonstrates the correct pattern.

`data-quality-engineer` lives in `qa-data-quality`. `production-tester` lives in `qa-shift-right`. `exploratory-charter-author` lives in `qa-manual-testing`.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| agent | [test-architect](agents/test-architect.md) | A2 | Per-repo pyramid + framework recommendation; reads change-set shape, computes current ratios, outputs evidence-backed target ratios + framework trade-off matrix. |
| agent | [quality-coach](agents/quality-coach.md) | A3 | Adversarial DoD-adherence reviewer; reads team's `definition-of-done.md`, walks each line, marks met/not-met/unverifiable with evidence. Refuses to mark "done" if any line unmet. |
| agent | [release-engineer](agents/release-engineer.md) | A4 | Runbook + canary-release conductor; pre-flight + smoke gate + canary deploy + observation + human gate + full rollout + post-release. Never auto-rollouts. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-roles@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework
(6 dimensions, including D6 terminology compliance). See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at the
repository root for the rubric.
