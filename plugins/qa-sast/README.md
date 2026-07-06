# qa-sast

SAST (static application security testing). Five per-tool skill
wrappers (Semgrep, SonarQube, CodeQL, Bandit, gosec) plus an
adversarial unifier agent (`sast-finding-triager`) that combines
multi-scanner output, deduplicates, applies waivers, and emits a
single PR-ready verdict.

Every scanner skill includes a `## False-positive triage` section
with concrete suppression patterns + justification template +
review cadence. Security scanners without FP triage become
shelf-ware (the team disables it, then forgets).

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [semgrep-rules](skills/semgrep-rules/SKILL.md) | Pattern-DSL multi-language SAST; registry rulesets + custom YAML; `semgrep ci` with baseline-diff for legacy adoption; SARIF/JSON/GitLab-SAST/JUnit output |
| Skill | [sonarqube-rules](skills/sonarqube-rules/SKILL.md) | Multi-language SAST + Quality Gate platform; new-code-period gating; persistent issue tracking; PR analysis (Developer+); REST API for automation |
| Skill | [codeql-queries](skills/codeql-queries/SKILL.md) | Semantic-database SAST with cross-file taint flows; `codeql database create/analyze`; query packs per language; GitHub Code Scanning native integration |
| Skill | [bandit-python](skills/bandit-python/SKILL.md) | Python-specific SAST; 60+ rules across 7 categories (B1xx-B7xx); two-dimensional severity + confidence filtering; pyproject.toml config |
| Skill | [gosec-go](skills/gosec-go/SKILL.md) | Go-specific SAST; 40+ rules (G101-G602); AST + SSA + taint analysis; integrated with golangci-lint |
| Agent | [sast-finding-triager](agents/sast-finding-triager.md) | Adversarial unifier across all 5 sister scanners; deduplicates by `(file, line, normalized_cwe)`; waiver enforcement (`expires:` + `approved_by:` + `reason:` mandatory); refuses pass with unwaived critical findings |
| Skill | [eslint-security-rules](skills/eslint-security-rules/SKILL.md) | ESLint security plugins (eslint-plugin-security + no-unsanitized) as the JS/TS first-party SAST layer. |
| Skill | [pmd-apex-rules](skills/pmd-apex-rules/SKILL.md) | PMD Apex security ruleset for Salesforce Apex SAST. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-sast@testland-qa
```
