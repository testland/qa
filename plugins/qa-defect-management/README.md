# qa-defect-management

Defect management discipline (taxonomy, lifecycle, workflows): 3 reference skills (bug-lifecycle-reference, severity-vs-priority-reference, defect-taxonomy-istqb) + 4 platform-workflow skills (jira-bug-workflow-runner, linear-bug-workflow-runner, github-issues-bug-workflow, azuredevops-bug-workflow) + 1 build skill (bug-report-from-failure) + 4 agents (duplicate-defect-finder, bug-report-critic, ci-defect-filer, defect-fix-verifier). Distinct from qa-bug-repro which covers reproduction + clustering + trend narration; this covers triage workflow + taxonomy + severity classification, and closes the lifecycle with post-fix confirmation testing.

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
| Skill | [azuredevops-bug-workflow](skills/azuredevops-bug-workflow/SKILL.md) | Author/triage/link bugs in Azure DevOps Boards via the Work Item Tracking REST API + WIQL. |
| Skill | [confirmation-testing-workflow](skills/confirmation-testing-workflow/SKILL.md) | Proves a claimed fix reached the build under test via merge-base ancestry rather than a version label, then re-runs the reproduction. Any ambiguous result resolves to BLOCKED. |
| Agent | [defect-fix-verifier](agents/defect-fix-verifier.md) | Confirmation testing: re-runs a defect's reproduction after the fix merges, verdicts VERIFIED / NOT FIXED / BLOCKED, and transitions the tracker with evidence. |

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
