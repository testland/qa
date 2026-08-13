# qa-test-management

Test case management discipline (pre-execution authoring + lifecycle + traceability): the `tcm-case-management` umbrella covering TestRail, Xray, Zephyr Scale, Allure TestOps, and Qase (one tool-agnostic workflow + per-vendor API references), the `test-case-anatomy-reference` rulebook (ISO 29119-3 anatomy + the review rubric), `traceability-matrix-builder`, and two agents (test-case-quality-critic, tcm-migration-agent). Distinct from qa-test-reporting's *-integration skills (post-execution result sync); this is pre-execution case authoring + repository management.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [tcm-case-management](skills/tcm-case-management/SKILL.md) | Test case management across TestRail, Xray, Zephyr Scale, Allure TestOps, and Qase - one tool-agnostic authoring workflow (TestRail worked end to end) + per-vendor API references |
| Skill | [test-case-anatomy-reference](skills/test-case-anatomy-reference/SKILL.md) | ISO 29119-3 + ISTQB CTAL-TM canonical case fields, tracker-schema map, and the six-axis per-case + six-axis set-level review rubric |
| Skill | [traceability-matrix-builder](skills/traceability-matrix-builder/SKILL.md) | Build requirements-to-tests matrix from any TCM + requirements source |
| Agent | [test-case-quality-critic](agents/test-case-quality-critic.md) | Audit test cases for anatomy + rubric + traceability quality - live TCM repositories (API) or exports / markdown matrices (CSV / JSON) |
| Agent | [tcm-migration-agent](agents/tcm-migration-agent.md) | Operationalizes a test-case-management tool migration: field mapping, export/transform/import, dry-run. |

## Differentiation

This plugin scopes **pre-execution case authoring + repository
management + traceability**. Sibling neighbours:

- [`qa-test-reporting`](../qa-test-reporting/) - has TestRail /
  Xray / Zephyr `*-integration` skills for **post-execution
  result sync** (different lifecycle stage).
- [`qa-process`](../qa-process/) - owns the upstream case-authoring
  skills (`test-case-ideation-from-story`,
  `test-case-from-live-feature`) whose markdown matrices
  [`test-case-quality-critic`](agents/test-case-quality-critic.md)
  also audits.
- [`qa-bdd`](../qa-bdd/) - Gherkin / Cucumber composability;
  `tcm-case-management`'s Xray reference accepts `.feature` imports.

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-test-management@testland-qa
```
