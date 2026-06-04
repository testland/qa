# qa-defect-management

Defect management discipline (taxonomy, lifecycle, workflows): 3 reference skills (bug-lifecycle-reference, severity-vs-priority-reference, defect-taxonomy-istqb) + 3 platform-workflow skills (jira-bug-workflow-runner, linear-bug-workflow-runner, github-issues-bug-workflow) + 1 build skill (bug-report-from-failure) + 2 agents (duplicate-defect-finder, bug-report-critic). Distinct from qa-bug-repro which covers reproduction + clustering + trend narration; this covers triage workflow + taxonomy + severity classification.

## Components

| Type | Name | Description |
| --- | --- | --- |
| skill | [bug-lifecycle-reference](skills/bug-lifecycle-reference/SKILL.md) | ISTQB-canonical defect lifecycle states + tracker-vocabulary map for Jira/Linear/GitHub |
| skill | [severity-vs-priority-reference](skills/severity-vs-priority-reference/SKILL.md) | Two-axis defect classification; 5×5 matrix with worked examples |
| skill | [defect-taxonomy-istqb](skills/defect-taxonomy-istqb/SKILL.md) | IEEE 1044-2009 + CTAL-TA + Chillarege ODC taxonomies |
| skill | [jira-bug-workflow-runner](skills/jira-bug-workflow-runner/SKILL.md) | Jira Cloud REST API v3 create/transition/JQL search |
| skill | [linear-bug-workflow-runner](skills/linear-bug-workflow-runner/SKILL.md) | Linear GraphQL issueCreate / issueUpdate / workflowStates |
| skill | [github-issues-bug-workflow](skills/github-issues-bug-workflow/SKILL.md) | GitHub Issues REST API v2022-11-28 + Projects v2 |
| skill | [bug-report-from-failure](skills/bug-report-from-failure/SKILL.md) | Turn JUnit/Allure/pytest failure records into tracker-agnostic bug specs |
| agent | [duplicate-defect-finder](agents/duplicate-defect-finder.md) | Search the tracker for likely duplicates; rank candidates by similarity |
| agent | [bug-report-critic](agents/bug-report-critic.md) | Audit a bug report against required fields, severity-priority independence, reproduction quality |
| Agent | [ci-defect-filer](agents/ci-defect-filer.md) | One-step CI auto-filer: turns a test failure into a deduped bug filed in Jira / Linear / GitHub Issues. |

## Differentiation

This plugin scopes **defect lifecycle + taxonomy + tracker workflow**.
Sibling neighbours:

- [`qa-bug-repro`](../qa-bug-repro/) - bug *reproduction* + crash
  triage + defect *clustering* (after filing). This plugin
  covers everything *upstream* of filing (classification,
  duplicate detection) and the filing itself (platform-specific
  workflows).
- [`qa-test-reporting`](../qa-test-reporting/) - has TestRail /
  Xray / Zephyr *result-sync* integrations (post-execution
  reporting). Distinct from this plugin's bug-tracker workflow
  runners (defect filing + lifecycle management).

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-defect-management@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
