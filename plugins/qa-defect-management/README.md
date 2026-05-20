# qa-defect-management

Defect management discipline (taxonomy, lifecycle, workflows): 3 reference skills (bug-lifecycle-reference, severity-vs-priority-reference, defect-taxonomy-istqb) + 3 platform-workflow skills (jira-bug-workflow-runner, linear-bug-workflow-runner, github-issues-bug-workflow) + 1 build skill (bug-report-from-failure) + 2 agents (duplicate-defect-finder, bug-report-critic). Distinct from qa-bug-repro which covers reproduction + clustering + trend narration; this covers triage workflow + taxonomy + severity classification.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| skill | [bug-lifecycle-reference](skills/bug-lifecycle-reference/SKILL.md) | S2 | ISTQB-canonical defect lifecycle states + tracker-vocabulary map for Jira/Linear/GitHub |
| skill | [severity-vs-priority-reference](skills/severity-vs-priority-reference/SKILL.md) | S2 | Two-axis defect classification; 5×5 matrix with worked examples |
| skill | [defect-taxonomy-istqb](skills/defect-taxonomy-istqb/SKILL.md) | S2 | IEEE 1044-2009 + CTAL-TA + Chillarege ODC taxonomies |
| skill | [jira-bug-workflow-runner](skills/jira-bug-workflow-runner/SKILL.md) | S1 | Jira Cloud REST API v3 create/transition/JQL search |
| skill | [linear-bug-workflow-runner](skills/linear-bug-workflow-runner/SKILL.md) | S1 | Linear GraphQL issueCreate / issueUpdate / workflowStates |
| skill | [github-issues-bug-workflow](skills/github-issues-bug-workflow/SKILL.md) | S1 | GitHub Issues REST API v2022-11-28 + Projects v2 |
| skill | [bug-report-from-failure](skills/bug-report-from-failure/SKILL.md) | S3 | Turn JUnit/Allure/pytest failure records into tracker-agnostic bug specs |
| agent | [duplicate-defect-finder](agents/duplicate-defect-finder.md) | A1 | Search the tracker for likely duplicates; rank candidates by similarity |
| agent | [bug-report-critic](agents/bug-report-critic.md) | A3 | Audit a bug report against required fields, severity-priority independence, reproduction quality |

## Differentiation

This plugin scopes **defect lifecycle + taxonomy + tracker workflow**.
Sibling neighbours:

- [`qa-bug-repro`](../qa-bug-repro/) — bug *reproduction* + crash
  triage + defect *clustering* (after filing). This plugin
  covers everything *upstream* of filing (classification,
  duplicate detection) and the filing itself (platform-specific
  workflows).
- [`qa-test-reporting`](../qa-test-reporting/) — has TestRail /
  Xray / Zephyr *result-sync* integrations (post-execution
  reporting). Distinct from this plugin's bug-tracker workflow
  runners (defect filing + lifecycle management).

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-defect-management@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
