# qa-shift-left

Shift-left QA: testability heuristics with the pre-implementation review workflow, acceptance-criteria + NFR extraction from product docs, STRIDE threat modeling with the from-spec workflow, data-contract extraction, and Gherkin coverage mapping.

DoD authoring/audit lives in the `definition-of-done` skill in the qa-process plugin.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [spec-testability-heuristics](skills/spec-testability-heuristics/SKILL.md) | Judges whether a written requirement can be tested at all: Observable, Decidable, Bounded, with untestable-to-testable rewrite pairs, a BLOCK / REVIEW / OK verdict, and the review workflow for running the rubric at sprint planning or PR review with per-verdict hand-offs. |
| Skill | [acceptance-criteria-extractor](skills/acceptance-criteria-extractor/SKILL.md) | Convert story / PRD into Gherkin (Feature / Scenario / Outline) or plain-list AC; flag implicit preconditions. |
| Skill | [non-functional-requirement-extractor](skills/non-functional-requirement-extractor/SKILL.md) | Pull threshold-bound NFRs (perf / a11y / security / compatibility / reliability / i18n / observability) from PRDs; flag missing thresholds. |
| Skill | [stride-threat-modeling](skills/stride-threat-modeling/SKILL.md) | Enumerates threats against a design using Microsoft STRIDE, each category paired with the security property it violates, a triage score labelled as convention rather than standard, and the from-spec workflow that writes the threat-model document into the repo. |
| Skill | [data-contract-extractor](skills/data-contract-extractor/SKILL.md) | Extract data contracts (schema + freshness + volume + distribution + ownership) from data PRDs; flag gaps; emit YAML for dbt/GX/Soda consumption. |
| Skill | [gherkin-scenario-coverage-map](skills/gherkin-scenario-coverage-map/SKILL.md) | Map new Gherkin scenarios against the existing suite to prevent duplicate tests. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-shift-left@testland-qa
```
