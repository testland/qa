---
name: test-case-anatomy-reference
description: "Pure-reference catalog of test-case anatomy - what fields a well-formed test case must have and what each field means. Enumerates the ISO/IEC/IEEE 29119-3:2021 test-case template fields (identifier, objective, preconditions, inputs, steps, expected results, postconditions, environment, traceability) and the ISTQB CTAL-TM specification-technique-driven additions (equivalence partition, boundary value, decision table, state transition). Maps the canonical anatomy to five tracker-specific schemas (TestRail, Xray, Zephyr Scale, Allure TestOps, Qase). Use as the authoritative source when authoring a case template, reviewing case quality, or migrating between tools."
---

# test-case-anatomy-reference

## Overview

A test case has nine required parts. Skipping any of them produces
a case that's either ambiguous (a tester can't run it) or
unverifiable (a reviewer can't tell if it passed). The canonical
list comes from ISO/IEC/IEEE 29119-3:2021 §6, augmented by ISTQB
CTAL-TM's specification-based-testing additions.

This skill is a **pure reference** consumed by
[`traceability-matrix-builder`](../traceability-matrix-builder/SKILL.md)
and the five platform-specific case-management skills.

## When to use

- Authoring a case template for a new project.
- Reviewing whether a draft case has all required fields.
- Migrating cases between tools (TestRail → Xray; Zephyr → Qase) - need to map fields consistently.
- Onboarding a tester to "what makes a case complete?"

## The nine canonical fields (ISO 29119-3 §6)

Per ISO/IEC/IEEE 29119-3:2021 "Software and systems engineering - 
Software testing - Part 3: Test documentation" (cite by stable
ID; full text behind iso.org paywall):

| # | Field | Purpose | Common mistakes |
|---|---|---|---|
| 1 | **Identifier** | Unique ID for cross-reference, traceability, defect linking. | Reusing IDs after deletion; non-stable IDs across migrations. |
| 2 | **Objective** | One-sentence statement of what's being verified. | Vague ("test checkout"); should state behaviour ("verify discount applies before tax"). |
| 3 | **Preconditions** | System state required before the case runs. | Implicit ("user is logged in"); should be executable / verifiable. |
| 4 | **Inputs** | Specific data values fed to the system. | Generic ("a valid email"); should be concrete ("alice@example.com"). |
| 5 | **Steps** | Numbered actions the tester performs. | Combining actions ("login and add item"); should be one action per step. |
| 6 | **Expected results** | What the system should produce per step / overall. | Missing per-step results; should pair each action with its expected outcome. |
| 7 | **Postconditions** | System state after the case (cleanup expectations). | Omitted; matters for shared environments. |
| 8 | **Environment** | Where the case is valid (browser, OS, build, locale). | Universal-applicability assumption; should constrain explicitly. |
| 9 | **Traceability** | Links to requirements, designs, defects. | One-way link only (case → req); should be bidirectional. |

## ISTQB CTAL-TM specification-technique additions

Per the ISTQB Advanced Test Manager and Test Analyst syllabi, when
a case is derived from a specification technique, it carries
technique-specific metadata:

| Technique | Additional fields |
|---|---|
| **Equivalence partitioning** | Partition (valid/invalid), partition label, representative input |
| **Boundary value analysis** | Boundary (min, max, on/off), the specific BVA value (-1, 0, 1, 99, 100, 101) |
| **Decision table** | Rule ID, condition vector, action vector |
| **State transition** | Starting state, event, ending state, output |
| **Use case** | Main success scenario step, extension point |
| **Classification tree** | Tree node path |

These fields don't replace the nine above - they're traceability
to the design technique that produced the case. Per the ISTQB
glossary
([glossary.istqb.org](https://glossary.istqb.org/)).

## Tracker-schema map

Five common trackers each store the canonical
anatomy under different field names:

### TestRail

| Canonical field | TestRail field |
|---|---|
| Identifier | `id` (e.g., `C1234`) |
| Objective | `title` |
| Preconditions | `custom_preconds` |
| Inputs | (within `custom_steps_separated[].content`) |
| Steps | `custom_steps_separated` (Steps template) or `custom_steps` (Text template) |
| Expected results | `custom_steps_separated[].expected` |
| Postconditions | (custom field if defined) |
| Environment | `custom_environment` (custom field) or filter via `refs` |
| Traceability | `refs` (free text); `template_id` (Steps / Text / Exploratory) |

TestRail templates (`template_id`): Steps (1) / Text (2) /
Exploratory (3). The Steps template enforces step-level structure;
Text is freeform; Exploratory is for SBTM-style charters.

### Xray (Atlassian)

Xray stores tests as Jira issues with `Test` issue type. Steps live
in a separate sub-entity.

| Canonical field | Xray field |
|---|---|
| Identifier | Jira key (e.g., `ENG-123`) |
| Objective | Jira `summary` |
| Preconditions | Linked precondition (separate Jira issue type) |
| Steps | Test steps section (per `testType: Manual`); for Cucumber, `Gherkin` section; for Generic, free-text |
| Expected results | per-step `expectedResult` |
| Environment | Test execution `testEnvironments` (set per run) |
| Traceability | Jira issue links (Tests / TestedBy) |

Xray `testType`: Manual / Cucumber / Generic. Determines how steps
are stored.

### Zephyr Scale (Smart Bear)

| Canonical field | Zephyr field |
|---|---|
| Identifier | `key` (e.g., `PROJ-T123`) |
| Objective | `name` |
| Preconditions | `precondition` |
| Steps | `testScript.steps[].description` |
| Expected results | `testScript.steps[].expectedResult` |
| Environment | Configured per test cycle, not case |
| Traceability | `issueLinks` (Jira issues) |

### Allure TestOps

| Canonical field | Allure TestOps field |
|---|---|
| Identifier | `id` (numeric, e.g., `1234`) |
| Objective | `name` |
| Preconditions | `precondition` |
| Steps | `scenario.steps` (recursive - steps can have sub-steps) |
| Expected results | Within step `expectedResult` |
| Environment | `tags` (key=value pairs) + execution env |
| Traceability | `relations` (links to other cases / requirements) |

### Qase

| Canonical field | Qase field |
|---|---|
| Identifier | `id` (within project; full ID is `PROJ-1234`) |
| Objective | `title` |
| Preconditions | `preconditions` |
| Steps | `steps[].action` |
| Expected results | `steps[].expected_result` |
| Environment | Custom fields |
| Traceability | `links` field |

## Severity, priority, type (cross-platform)

All five trackers carry severity / priority / type fields. Each
uses its own enum but they map similarly:

| Concept | TestRail | Xray | Zephyr Scale | Allure TestOps | Qase |
|---|---|---|---|---|---|
| Priority | `priority_id` (1-4) | Jira `priority` field | `priority` enum | Custom | `priority` enum (low/med/high) |
| Severity | Custom field | Custom field | `severity` enum (minor/normal/major/critical/blocker) | `severity` (default labels) | `severity` enum |
| Type | `type_id` (Functional, Performance, etc.) | `testType` (Manual/Cucumber/Generic) | `testType` (Manual/Automated) | Custom | `type` (functional/smoke/regression/etc.) |
| Automation status | `custom_automation_type` | Linked to automation results | `automation` field | Tags | `automation` (manual/automated/to-be-automated) |

## Field cardinality reference

A migration / template author must know which fields are
one-to-one and which are one-to-many:

| Field | Cardinality |
|---|---|
| Identifier | 1 |
| Objective | 1 |
| Preconditions | 1 (free text) or n (linked sub-entities, Xray-style) |
| Steps | n (ordered) |
| Inputs | n (per step) |
| Expected results | n (one per step + optional overall) |
| Postconditions | 1 |
| Environment | n (browser × OS × locale × build) |
| Traceability | n (requirements, designs, defects) |
| Severity | 1 |
| Priority | 1 |
| Type | 1 |
| Automation status | 1 |
| Tags | n |

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| One step per case | Cases proliferate; coverage harder to track | Group related steps into one case with multiple ordered steps |
| Steps as a single text blob | Per-step pass/fail tracking impossible | Use Steps template (TestRail) / steps array (everywhere else) |
| Implicit preconditions | "User is logged in" - but as whom? | State preconditions in verifiable terms |
| Generic inputs | "Use a valid email" - tester picks one, results vary | Specify concrete inputs |
| No traceability links | Case-to-requirement orphans; coverage reporting broken | Always link to at least one requirement |
| Missing expected results per step | Tester runs steps but can't tell what to assert | Pair every step with its expected outcome |
| Tracker-specific case structure mixed in | Migration cost exploded | Author cases in the canonical anatomy; let tracker mapping be additive |
| Reusing IDs after deletion | History broken; defect links point to ghost cases | IDs are immutable; deletion is soft |

## Limitations

- **Tracker reality varies.** Custom-field discipline differs
  across orgs; this anatomy is the floor.
- **Specification-technique linkage is optional.** Most teams
  don't carry the technique metadata; ISTQB-aligned orgs do.
- **Environment as a case-level field is imperfect.** Some
  trackers (Xray, Zephyr) push environment to the run level - the
  case is environment-agnostic until executed.
- **Traceability is bidirectional in theory, often unidirectional
  in practice.** Tools support bidirectional but discipline lapses.

## References

- ISO/IEC/IEEE 29119-3:2021 §6 "Test case specification" - cite
  by stable ID; canonical anatomy. Full text behind iso.org paywall.
- ISTQB Advanced Test Manager (CTAL-TM) syllabus - 
  specification-technique-driven case derivation.
- ISTQB Glossary - 
  [glossary.istqb.org](https://glossary.istqb.org/).
- TestRail Cases API reference - 
  support.testrail.com/hc/en-us/articles/7077871398036-Cases
  (Cloudflare-protected; cite by stable URL).
- Xray Cloud REST API - docs.getxray.app/display/XRAYCLOUD/REST+API.
- Zephyr Scale Cloud REST API v2 - 
  smartbear.com/test-management/zephyr-scale.
- Allure TestOps REST API - 
  docs.qameta.io/allure-testops/integrations/rest-api/.
- Qase Public API - developers.qase.io.
- Sibling skills:
  [`traceability-matrix-builder`](../traceability-matrix-builder/SKILL.md),
  [`testrail-case-management`](../testrail-case-management/SKILL.md),
  [`xray-case-management`](../xray-case-management/SKILL.md),
  [`zephyr-scale-case-management`](../zephyr-scale-case-management/SKILL.md),
  [`allure-testops-case-management`](../allure-testops-case-management/SKILL.md),
  [`qase-io-case-management`](../qase-io-case-management/SKILL.md).
