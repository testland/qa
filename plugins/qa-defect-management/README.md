# qa-defect-management

Defect management discipline (classification, lifecycle, tracker workflow): 3 skills (bug-tracker-workflow covering Jira / Linear / GitHub Issues / Azure DevOps, severity-vs-priority-reference with lifecycle + taxonomy references, confirmation-testing-workflow) and 2 agents (ci-defect-filer, defect-fix-verifier). Distinct from qa-bug-repro which covers reproduction, report authoring, and the weekly defect-review pipeline; this covers triage classification, the tracker workflow itself, and closes the lifecycle with post-fix confirmation testing.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [bug-tracker-workflow](skills/bug-tracker-workflow/SKILL.md) | File / transition / search bugs in the tracker - Jira REST v3 worked in full; Linear, GitHub Issues, and Azure DevOps deep dives in references. |
| Skill | [severity-vs-priority-reference](skills/severity-vs-priority-reference/SKILL.md) | Two-axis defect classification (5×5 matrix with worked examples), plus lifecycle states/transitions and IEEE 1044 / CTAL-TA / ODC taxonomies in references. |
| Skill | [confirmation-testing-workflow](skills/confirmation-testing-workflow/SKILL.md) | Proves a claimed fix reached the build under test via merge-base ancestry rather than a version label, then re-runs the reproduction. Any ambiguous result resolves to BLOCKED. |
| Agent | [ci-defect-filer](agents/ci-defect-filer.md) | One-step CI auto-filer: turns a test failure into a deduped bug filed in Jira / Linear / GitHub Issues - four-strategy duplicate search built in. |
| Agent | [defect-fix-verifier](agents/defect-fix-verifier.md) | Confirmation testing: re-runs a defect's reproduction after the fix merges, verdicts VERIFIED / NOT FIXED / BLOCKED, and transitions the tracker with evidence. |

## Differentiation

This plugin scopes **defect classification + tracker workflow**.
Sibling neighbours:

- [`qa-bug-repro`](../qa-bug-repro/) - bug *reproduction*, report
  authoring (including the from-CI-failure spec builder and review
  checklist), and the weekly defect-review pipeline. This plugin
  covers the filing itself (platform workflows), classification
  vocabulary, and post-fix verification.
- [`qa-test-reporting`](../qa-test-reporting/) - has TestRail /
  Xray / Zephyr *result-sync* integrations (post-execution
  reporting). Distinct from this plugin's bug-tracker workflow
  (defect filing + lifecycle management).

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-defect-management@testland-qa
```
