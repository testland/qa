# qa-shift-left

Shift-left QA: testability review, acceptance-criteria + NFR extraction from product docs, Definition-of-Done checking, STRIDE threat modeling, data-contract extraction, and spec-to-suite orchestration.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Agent | [testability-reviewer](agents/testability-reviewer.md) | A1 | Pre-implementation review: flag claims failing Observable / Decidable / Bounded heuristics; suggest rewrite per claim. |
| Skill | [acceptance-criteria-extractor](skills/acceptance-criteria-extractor/SKILL.md) | S3 | Convert story / PRD into Gherkin (Feature / Scenario / Outline) or plain-list AC; flag implicit preconditions. |
| Skill | [nfr-extractor](skills/nfr-extractor/SKILL.md) | S3 | Pull threshold-bound NFRs (perf / a11y / security / compatibility / reliability / i18n / observability) from PRDs; flag missing thresholds. |
| Agent | [definition-of-done-checker](agents/definition-of-done-checker.md) | A3 | Adversarial: validate story / PR against the team's DoD checklist; reject on any unmet item with rationale. |
| Agent | [threat-model-from-spec](agents/threat-model-from-spec.md) | A4 | Builder: produce a STRIDE threat model from a feature spec; one row per (asset × category); likelihood × impact scoring; OWASP ASVS-anchored mitigations. |
| Skill | [data-contract-extractor](skills/data-contract-extractor/SKILL.md) | S3 | Extract data contracts (schema + freshness + volume + distribution + ownership) from data PRDs; flag gaps; emit YAML for dbt/GX/Soda consumption. |
| Agent | [spec-to-suite-orchestrator](agents/spec-to-suite-orchestrator.md) | A2 | W3 workflow: chain testability → AC + NFR → threat model + data contract → test stubs → artifact bundle. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-shift-left@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at the
repository root for the rubric.
