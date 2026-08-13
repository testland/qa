# qa-iac

Infrastructure-as-code testing + security policy. Terraform plan review, Helm chart unit testing, OPA / Conftest / Cedar policy testing, plus two differentiated security scanners (Checkov, Trivy - the tfsec successor, legacy tfsec workflow in its references) and a policy-checker agent that combines scanner results.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Agent | [terraform-plan-reviewer](agents/terraform-plan-reviewer.md) | Read-only adversarial reviewer that analyzes a `terraform plan` output (JSON form via `terraform show -json`) for high-blast-radius changes - flags resource destruction (deletes), security degradation (broader IAM, public exposure, encryption disabled), drift (manually-changed resources), and risky combinations (DB destroy + new DB without import). Per-flag severity + remediation. Use as a PR-time gate against unintentional infrastructure damage. |
| Agent | [iac-policy-checker](agents/iac-policy-checker.md) | Adversarial agent that combines Checkov + tfsec + KICS scan results into a unified IaC policy verdict - deduplicates findings (same issue caught by multiple scanners), groups by severity, classifies into critical / high / medium / low, applies team-defined waivers, and emits a single PR-comment summary. Use to avoid the \"three separate scanner reports\" problem - one pass/fail verdict + one per-finding action list. |
| Skill | [helm-chart-tester](skills/helm-chart-tester/SKILL.md) | Configures helm-unittest for Helm chart unit testing - installs `helm-unittest` plugin, authors `tests/*.yaml` per template, asserts on rendered manifests (`isKind`, `isAPIVersion`, `equal`, `matchRegex`), runs via `helm unittest`. Plus chart linting (`helm lint`) and render testing (`helm template`). Use when the team ships Helm charts and needs unit-level verification of the templates. |
| Skill | [policy-as-code-runner](skills/policy-as-code-runner/SKILL.md) | Configures policy-as-code testing using OPA / Conftest / Cedar - authors policies in Rego (OPA's language), runs Conftest against Kubernetes manifests / Terraform plans / Dockerfiles / arbitrary structured data, integrates with CI for PR-time policy gates. Per OPA's docs: \"an open source, general-purpose policy engine that unifies policy enforcement across the stack.\" Use to express + enforce custom policies (cost limits, tagging requirements, security baselines) that Checkov / tfsec / KICS don't cover. |
| Skill | [checkov-policy](skills/checkov-policy/SKILL.md) | Configures Checkov for IaC security scanning across Terraform, CloudFormation, Kubernetes, Helm, ARM, Serverless, AWS CDK - installs `pip install checkov`, runs against per-framework directories, customizes rules via skip / override / custom Python checks, integrates SARIF / JUnit output for CI dashboards. Per Checkov: \"scans cloud infrastructure configurations to find misconfigurations before they're deployed.\" Use as the broad-coverage IaC security scanner. |
| Skill | [trivy-config](skills/trivy-config/SKILL.md) | Trivy IaC/config scanning (tfsec successor): misconfig policies, custom Rego, SARIF, CI gate; legacy tfsec workflow + custom YAML rules in references/tfsec-legacy.md. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-iac@testland-qa
```
