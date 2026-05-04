# qa-shift-left

Shift-left QA: testability review, acceptance-criteria + NFR extraction from product docs, Definition-of-Done checking, STRIDE threat modeling, data-contract extraction, and spec-to-suite orchestration.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| agent | [testability-reviewer](agents/testability-reviewer.md) | A1 | Pre-implementation review: flag claims failing Observable / Decidable / Bounded heuristics; suggest rewrite per claim. |
| skill | [acceptance-criteria-extractor](skills/acceptance-criteria-extractor/SKILL.md) | S3 | Convert story / PRD into Gherkin (Feature / Scenario / Outline) or plain-list AC; flag implicit preconditions. |
| skill | [nfr-extractor](skills/nfr-extractor/SKILL.md) | S3 | Pull threshold-bound NFRs (perf / a11y / security / compatibility / reliability / i18n / observability) from PRDs; flag missing thresholds. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-shift-left@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework
(6 dimensions, including D6 terminology compliance). See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at the
repository root for the rubric.
