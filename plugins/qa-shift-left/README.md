# qa-shift-left

Shift-left QA: testability review, acceptance-criteria + NFR extraction from product docs, Definition-of-Done checking, STRIDE threat modeling, data-contract extraction, and spec-to-suite orchestration.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Agent | [testability-reviewer](agents/testability-reviewer.md) | Pre-implementation review: flag claims failing Observable / Decidable / Bounded heuristics; suggest rewrite per claim. |
| Skill | [acceptance-criteria-extractor](skills/acceptance-criteria-extractor/SKILL.md) | Convert story / PRD into Gherkin (Feature / Scenario / Outline) or plain-list AC; flag implicit preconditions. |
| Skill | [non-functional-requirement-extractor](skills/non-functional-requirement-extractor/SKILL.md) | Pull threshold-bound NFRs (perf / a11y / security / compatibility / reliability / i18n / observability) from PRDs; flag missing thresholds. |
| Agent | [definition-of-done-checker](agents/definition-of-done-checker.md) | Adversarial: validate story / PR against the team's DoD checklist; reject on any unmet item with rationale. |
| Agent | [threat-model-from-spec](agents/threat-model-from-spec.md) | Builder: produce a STRIDE threat model from a feature spec; one row per (asset × category); likelihood × impact scoring; OWASP ASVS-anchored mitigations. |
| Skill | [data-contract-extractor](skills/data-contract-extractor/SKILL.md) | Extract data contracts (schema + freshness + volume + distribution + ownership) from data PRDs; flag gaps; emit YAML for dbt/GX/Soda consumption. |
| Skill | [gherkin-scenario-coverage-map](skills/gherkin-scenario-coverage-map/SKILL.md) | Map new Gherkin scenarios against the existing suite to prevent duplicate tests. |
| Skill | [stride-threat-modeling](skills/stride-threat-modeling/SKILL.md) | Enumerates threats against a design using Microsoft STRIDE, each category paired with the security property it violates, plus a triage score labelled as convention rather than standard. |
| Skill | [spec-testability-heuristics](skills/spec-testability-heuristics/SKILL.md) | Judges whether a written requirement can be tested at all: Observable, Decidable, Bounded, with untestable-to-testable rewrite pairs and a BLOCK / REVIEW / OK verdict. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-shift-left@testland-qa
```
