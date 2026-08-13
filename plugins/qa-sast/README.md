# qa-sast

SAST (static application security testing). Three per-tool skill
wrappers (Semgrep, SonarQube, CodeQL), the `language-native-sast`
umbrella for the first-party linter family (Bandit, gosec,
eslint-plugin-security, PMD Apex), the `multi-tool-finding-triage`
gate method, plus an adversarial unifier agent
(`sast-finding-triager`) that combines multi-scanner output,
deduplicates, applies waivers, and emits a single PR-ready verdict.

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
| Skill | [language-native-sast](skills/language-native-sast/SKILL.md) | The first-party "linter as SAST" family: Bandit (Python), gosec (Go), eslint-plugin-security + no-unsanitized (JS/TS), PMD Apex security ruleset (Salesforce) - shared adoption pattern with per-tool references |
| Agent | [sast-finding-triager](agents/sast-finding-triager.md) | Adversarial unifier across the sister scanners; deduplicates by `(file, line, normalized_cwe)`; waiver enforcement (`expires:` + `approved_by:` + `reason:` mandatory); refuses pass with unwaived critical findings |
| Skill | [multi-tool-finding-triage](skills/multi-tool-finding-triage/SKILL.md) | Merges two or more scanner reports into one gate: canonical Finding normalization, dedupe with `caught_by` consensus, waiver validation (`expires:` + `approved_by:` + `reason:`), `fail_on` verdict, severity-bucketed PR comment. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-sast@testland-qa
```
