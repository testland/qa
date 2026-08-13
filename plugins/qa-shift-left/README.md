# qa-shift-left

Shift-left QA: testability heuristics with the pre-implementation review workflow, NFR extraction from product docs, and STRIDE threat modeling with the from-spec workflow.

DoD authoring/audit lives in the `definition-of-done` skill in the qa-process plugin. Acceptance-criteria extraction and Gherkin authoring live in `gherkin-from-stories` (qa-bdd); scenario coverage mapping lives in `bdd-step-library-curator` (qa-bdd); data-contract extraction lives in `data-contract-extractor` (qa-data-quality).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [spec-testability-heuristics](skills/spec-testability-heuristics/SKILL.md) | Judges whether a written requirement can be tested at all: Observable, Decidable, Bounded, with untestable-to-testable rewrite pairs, a BLOCK / REVIEW / OK verdict, and the review workflow for running the rubric at sprint planning or PR review with per-verdict hand-offs. |
| Skill | [non-functional-requirement-extractor](skills/non-functional-requirement-extractor/SKILL.md) | Pull threshold-bound NFRs (perf / a11y / security / compatibility / reliability / i18n / observability) from PRDs; flag missing thresholds. |
| Skill | [stride-threat-modeling](skills/stride-threat-modeling/SKILL.md) | Enumerates threats against a design using Microsoft STRIDE, each category paired with the security property it violates, a triage score labelled as convention rather than standard, and the from-spec workflow that writes the threat-model document into the repo. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-shift-left@testland-qa
```
