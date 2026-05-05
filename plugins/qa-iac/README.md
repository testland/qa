# qa-iac

Infrastructure-as-code testing + security policy. Terraform plan review, Helm chart unit testing, OPA / Conftest / Cedar policy testing, plus three differentiated security niches (Checkov, tfsec, KICS) and a policy-checker agent that combines their results.

## Components

| Type | Name | Archetype |
|---|---|---|
| Agent | [terraform-plan-reviewer](agents/terraform-plan-reviewer.md) | A1 |
| Agent | [iac-policy-checker](agents/iac-policy-checker.md) | A3 |
| Skill | [helm-chart-tester](skills/helm-chart-tester/SKILL.md) | S1 |
| Skill | [policy-as-code-runner](skills/policy-as-code-runner/SKILL.md) | S1 |
| Skill | [checkov-policy](skills/checkov-policy/SKILL.md) | S1 |
| Skill | [tfsec-policy](skills/tfsec-policy/SKILL.md) | S1 |
| Skill | [kics-policy](skills/kics-policy/SKILL.md) | S1 |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-iac@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
