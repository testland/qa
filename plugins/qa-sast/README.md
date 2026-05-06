# qa-sast

SAST (static application security testing). Five per-tool skill
wrappers (Semgrep, SonarQube, CodeQL, Bandit, gosec) plus an
adversarial unifier agent (`sast-finding-triager`) that combines
multi-scanner output, deduplicates, applies waivers, and emits a
single PR-ready verdict.

**First Phase 5 plugin per the v2 master plan.** Revisits the v1
§13 NOT-GAPS exclusion of generic SAST wrappers — the existing
ecosystem wrappers were count-saturated but quality-saturated only
modestly (most score ≤17 on v2.0). Source-grounded per-tool skills
+ a unifier agent (the qa-iac differentiation model) add real
value.

**Phase 5-specific amendment enforced:** every scanner skill
includes a `## False-positive triage` section with concrete
suppression patterns + justification template + review cadence.
Security scanners without FP triage become shelf-ware (the team
disables it, then forgets).

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [semgrep-rules](skills/semgrep-rules/SKILL.md) | S1 | Pattern-DSL multi-language SAST; registry rulesets + custom YAML; `semgrep ci` with baseline-diff for legacy adoption; SARIF/JSON/GitLab-SAST/JUnit output |
| Skill | [sonarqube-rules](skills/sonarqube-rules/SKILL.md) | S1 | Multi-language SAST + Quality Gate platform; new-code-period gating; persistent issue tracking; PR analysis (Developer+); REST API for automation |
| Skill | [codeql-queries](skills/codeql-queries/SKILL.md) | S1 | Semantic-database SAST with cross-file taint flows; `codeql database create/analyze`; query packs per language; GitHub Code Scanning native integration |
| Skill | [bandit-python](skills/bandit-python/SKILL.md) | S1 | Python-specific SAST; 60+ rules across 7 categories (B1xx-B7xx); two-dimensional severity + confidence filtering; pyproject.toml config |
| Skill | [gosec-go](skills/gosec-go/SKILL.md) | S1 | Go-specific SAST; 40+ rules (G101-G602); AST + SSA + taint analysis; integrated with golangci-lint |
| Agent | [sast-finding-triager](agents/sast-finding-triager.md) | A3 | Adversarial unifier across all 5 sister scanners; deduplicates by `(file, line, normalized_cwe)`; waiver enforcement (`expires:` + `approved_by:` + `reason:` mandatory); refuses pass with unwaived critical findings |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-sast@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework
(6 dimensions, including D6 terminology compliance) **with the v2
amendment D6=4 floor for Phase 4+ components** + the **Phase 5
amendment requiring the False-positive triage section in every
scanner skill** — every concrete claim is cited inline at the point
of use, and every scanner ships with concrete FP-triage workflow.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md)
at the repository root for the rubric.
