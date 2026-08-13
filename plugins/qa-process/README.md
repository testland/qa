# qa-process

Test process + methodology - the risk-based testing umbrella (risk matrix + registers + storming + calibration + coverage mapping), Definition of Done authoring + adherence auditing, test strategy + risk-based test planning, blameless post-mortems, release readiness gates, smoke-suite gating, test-pyramid analysis, framework + vendor + tool selection, test effort estimation, E2E suite budgets, and test-case ideation from stories or live features.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [attack-surface-test-checklist](skills/attack-surface-test-checklist/SKILL.md) | Maps a diff to the attack surfaces it touches, then to OWASP ASVS requirements, Top 10 2021 categories, and WSTG sections, emitting per-surface manual and automated test items. |
| Skill | [definition-of-done](skills/definition-of-done/SKILL.md) | The team's Definition of Done, both halves: authors the starter DoD + per-PR checklist per the Scrum Guide, and audits work against an existing DoD line by line with repository evidence (met / not met / unverifiable). |
| Skill | [e2e-suite-budget](skills/e2e-suite-budget/SKILL.md) | Build-an-X workflow that caps the E2E suite size by computing flakiness ROI per test - for each E2E test, computes (regressions caught ×... |
| Skill | [framework-choice-advisor](skills/framework-choice-advisor/SKILL.md) | Reference catalog for picking a test automation framework or QA tool - Playwright / Cypress / Selenium / mobile / API / perf tradeoff matrices, plus commercial vendor evaluation and the ADR-based tool-selection decision record in references/. |
| Skill | [post-mortem-author](skills/post-mortem-author/SKILL.md) | Build-an-X workflow that produces a blameless post-mortem from an incident - captures the timeline (chronological event sequence with sou... |
| Skill | [risk-matrix](skills/risk-matrix/SKILL.md) | The risk-based testing (RBT) umbrella - per-feature / per-release risk matrix authoring, risk coverage mapping, and references/ for product + project risk registers, risk storming, calibration, and the register review checklist. |
| Skill | [smoke-suite-gate](skills/smoke-suite-gate/SKILL.md) | Build-an-X workflow for a critical-path smoke suite that runs in <5 minutes - picks the 5-15 highest-business-value journeys (login, hero... |
| Skill | [test-case-from-live-feature](skills/test-case-from-live-feature/SKILL.md) | Build-an-X workflow that produces a test-case matrix from a **live, undocumented feature** using structured exploration plus the bundled heuristic models (SFDPOT, Whittaker attacks, FEW HICCUPPS, ISO 25010) in references/. |
| Skill | [test-case-ideation-from-story](skills/test-case-ideation-from-story/SKILL.md) | Takes a user story or feature spec and emits a markdown test-case matrix - one row per case (id, title, precondition, steps, expected, ti... |
| Skill | [test-effort-estimation](skills/test-effort-estimation/SKILL.md) | PERT three-point test effort estimation reported as a range, with a mandatory assumptions ledger and a per-layer ownership split. Bundles the change-shape classifier (pure-logic / service-layer / ui-heavy / data-heavy) in references/. |
| Skill | [test-pyramid-balancer](skills/test-pyramid-balancer/SKILL.md) | Build-an-X workflow that analyzes a repo's test mix (unit / integration / E2E counts + runtimes) and recommends rebalancing toward Cohn's... |
| Skill | [test-strategy-author](skills/test-strategy-author/SKILL.md) | Build-an-X workflow that produces a test strategy document for a project / release / feature, plus a risk-based test-planning workflow that turns a feature scope and the risk matrix into a budgeted per-risk test plan. |
| Agent | [release-readiness-checker](agents/release-readiness-checker.md) | Builder/scaffolder agent that runs a configurable gate suite before a release - reads `release-readiness.yml` (which defines the gates: s... |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-process@testland-qa
```
