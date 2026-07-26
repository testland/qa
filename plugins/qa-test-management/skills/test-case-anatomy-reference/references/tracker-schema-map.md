# Tracker-schema map

Five common trackers each store the canonical test-case anatomy under
different field names. Use this map when migrating cases between tools
or when a template author must know the exact per-tracker field to
write to. Sources for each tracker's API are listed in the parent
SKILL.md References section.

## TestRail

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

## Xray (Atlassian)

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

## Zephyr Scale (Smart Bear)

| Canonical field | Zephyr field |
|---|---|
| Identifier | `key` (e.g., `PROJ-T123`) |
| Objective | `name` |
| Preconditions | `precondition` |
| Steps | `testScript.steps[].description` |
| Expected results | `testScript.steps[].expectedResult` |
| Environment | Configured per test cycle, not case |
| Traceability | `issueLinks` (Jira issues) |

## Allure TestOps

| Canonical field | Allure TestOps field |
|---|---|
| Identifier | `id` (numeric, e.g., `1234`) |
| Objective | `name` |
| Preconditions | `precondition` |
| Steps | `scenario.steps` (recursive - steps can have sub-steps) |
| Expected results | Within step `expectedResult` |
| Environment | `tags` (key=value pairs) + execution env |
| Traceability | `relations` (links to other cases / requirements) |

## Qase

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
