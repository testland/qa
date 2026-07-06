# qa-roles

Consolidated QA org chart of 15 sharply-scoped role agents - each ships a specific task for the role, not a job-title persona.

## Components

### Tier 1 - Hands-on / IC

| Role | Agent | One-line task |
| --- | --- | --- |
| Manual & Exploratory Tester | [exploratory-charter-author](agents/exploratory-charter-author.md) | Authors SBTM-style session charters (mission, areas, PROOF deliverables, time-box) from a feature spec or risk area. |
| SDET / Automation Engineer | [automation-harness-bootstrapper](agents/automation-harness-bootstrapper.md) | Scaffolds a full test-automation harness skeleton (folders, fixtures, page-object base, smoke test, CI job) for a repo with no existing suite. |
| Performance Test Engineer | [load-test-plan-designer](agents/load-test-plan-designer.md) | Designs a tool-agnostic load-test plan mapping SLOs to ramp/soak/spike profiles with pass/fail thresholds. |
| Security Tester / AppSec | [security-test-plan-builder](agents/security-test-plan-builder.md) | Builds a per-PR security test checklist by mapping the diff's attack surface to OWASP ASVS and Top 10 requirements. |
| Accessibility Specialist | [a11y-manual-test-scripter](agents/a11y-manual-test-scripter.md) | Produces step-by-step keyboard-navigation and screen-reader manual test scripts mapped to WCAG 2.2 success criteria. |
| Data Quality Engineer | [data-quality-engineer](agents/data-quality-engineer.md) | Builds an initial data-quality assertion suite (dbt / GX / Soda) for a single data product from schema and sample. |
| Production Tester | [production-tester](agents/production-tester.md) | Authors and wires a synthetic monitor for one critical user journey, end-to-end including PR creation. |

### Tier 2 - Lead / Senior

| Role | Agent | One-line task |
| --- | --- | --- |
| Test Architect | [test-architect](agents/test-architect.md) | Recommends a defensible test pyramid balance and framework choice per repo, backed by current-ratio analysis and ROI math. |
| QA / Test Lead | [test-effort-estimator](agents/test-effort-estimator.md) | Estimates testing effort for an epic and proposes a who-tests-what ownership split across the team. |
| Quality Coach (DoD) | [quality-coach](agents/quality-coach.md) | Adversarially reviews a story or PR against the team's Definition of Done, tagging each line met / not met / unverifiable. |
| Test Quality Coach | [test-quality-coach](agents/test-quality-coach.md) | Growth-framing coach that scores test files on AAA structure, naming, and conventions for onboarding and ramp-up. |

### Tier 3 - Manager / Release

| Role | Agent | One-line task |
| --- | --- | --- |
| Release Engineer | [release-engineer](agents/release-engineer.md) | Orchestrates one release runbook (smoke gate, canary deploy, metric thresholds, rollout/rollback) pausing at every human decision point. |
| Release Manager | [release-cutover-coordinator](agents/release-cutover-coordinator.md) | Coordinates a multi-team release cutover - builds the go/no-go checklist, sequences cross-team gates, assigns owners and timeboxes. |
| QA Manager | [qa-manager](agents/qa-manager.md) | Generates a weekly RAG quality-status digest from CI history, defect tracker, and flake-quarantine state. |

### Tier 4 - Head / Director

| Role | Agent | One-line task |
| --- | --- | --- |
| Head of QA / Director | [head-of-quality](agents/head-of-quality.md) | Aggregates per-team signals into a portfolio quality roll-up: cross-team KPIs, risk heatmap, and capacity view across squads. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-roles@testland-qa
```
