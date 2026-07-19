# qa-test-management

Test case management discipline (pre-execution authoring + lifecycle + traceability): 1 reference skill (test-case-anatomy-reference) + 5 platform case-management skills (testrail-case-management, xray-case-management, zephyr-scale-case-management, allure-testops-case-management, qase-io-case-management) + 1 build skill (traceability-matrix-builder) + 1 agent (test-case-quality-critic). Distinct from qa-test-reporting's *-integration skills (post-execution result sync); this is pre-execution case authoring + repository management.

## Components

| Type | Name | Description |
| --- | --- | --- |
| skill | [test-case-anatomy-reference](skills/test-case-anatomy-reference/SKILL.md) | ISO 29119-3 + ISTQB CTAL-TM canonical case fields + tracker-schema map |
| skill | [testrail-case-management](skills/testrail-case-management/SKILL.md) | TestRail API v2: cases + suites + sections + templates |
| skill | [xray-case-management](skills/xray-case-management/SKILL.md) | Xray Cloud GraphQL + REST: Manual / Cucumber / Generic tests |
| skill | [zephyr-scale-case-management](skills/zephyr-scale-case-management/SKILL.md) | Zephyr Scale Cloud REST v2: testcases + testScript + folders |
| skill | [allure-testops-case-management](skills/allure-testops-case-management/SKILL.md) | Allure TestOps REST: cases + nested scenarios + automation linking |
| skill | [qase-io-case-management](skills/qase-io-case-management/SKILL.md) | Qase Public API v1: cases + suites + shared steps |
| skill | [traceability-matrix-builder](skills/traceability-matrix-builder/SKILL.md) | Build requirements-to-tests matrix from any TCM + requirements source |
| skill | [test-case-review-rubric](skills/test-case-review-rubric/SKILL.md) | Scores a written test case on six per-case and six set-level quality axes, derives PASS / WEAK / FAIL without averaging, and marks each threshold as standard-backed or practitioner convention. |
| agent | [test-case-quality-critic](agents/test-case-quality-critic.md) | Audit a TCM case repository for anatomy + traceability + step quality |
| Agent | [tcm-migration-agent](agents/tcm-migration-agent.md) | Operationalizes a test-case-management tool migration: field mapping, export/transform/import, dry-run. |

## Differentiation

This plugin scopes **pre-execution case authoring + repository
management + traceability**. Sibling neighbours:

- [`qa-test-reporting`](../qa-test-reporting/) - has TestRail /
  Xray / Zephyr `*-integration` skills for **post-execution
  result sync** (different lifecycle stage).
- [`qa-process`](../qa-process/) - contains
  `test-case-quality-auditor` that audits exported case
  reports for quality metrics; this plugin's
  [`test-case-quality-critic`](agents/test-case-quality-critic.md)
  operates *in* the TCM (via API) and includes traceability
  analysis.
- [`qa-bdd`](../qa-bdd/) - Gherkin / Cucumber composability;
  `xray-case-management` accepts `.feature` imports.

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-test-management@testland-qa
```
