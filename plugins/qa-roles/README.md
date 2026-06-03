# qa-roles

Sharply-scoped QA role agents - each one ships a **specific task** for the role, not a job-title persona. The marketplace's lint rules reject `qa-expert` / `quality-engineer` / `qa-master` style names; this plugin demonstrates the correct pattern.

`production-tester` lives in `qa-shift-right`. `exploratory-charter-author` lives in `qa-manual-testing`.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Agent | [test-architect](agents/test-architect.md) | Per-repo pyramid + framework recommendation; reads change-set shape, computes current ratios, outputs evidence-backed target ratios + framework trade-off matrix. |
| Agent | [quality-coach](agents/quality-coach.md) | Adversarial DoD-adherence reviewer; reads team's `definition-of-done.md`, walks each line, marks met/not-met/unverifiable with evidence. Refuses to mark "done" if any line unmet. |
| Agent | [release-engineer](agents/release-engineer.md) | Runbook + canary-release conductor; pre-flight + smoke gate + canary deploy + observation + human gate + full rollout + post-release. Never auto-rollouts. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-roles@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.
