# qa-roles

Consolidated QA org chart of 15 sharply-scoped role agents - each ships a specific task for the role, not a job-title persona.

## Components

### Tier 1 - Hands-on / IC

| Role | Agent | One-line task |
| --- | --- | --- |
| Manual & Exploratory Tester | [exploratory-charter-author](agents/exploratory-charter-author.md) | Authors SBTM-style session charters (mission, areas, PROOF deliverables, time-box) from a feature spec or risk area. |
| SDET / Automation Engineer | [automation-harness-bootstrapper](agents/automation-harness-bootstrapper.md) | Scaffolds a full test-automation harness skeleton (folders, fixtures, page-object base, smoke test, CI job) for a repo with no existing suite. |

### Tier 2 - Lead / Senior

| Role | Agent | One-line task |
| --- | --- | --- |
| Quality Coach (DoD) | [quality-coach](agents/quality-coach.md) | Adversarially reviews a story or PR against the team's Definition of Done, tagging each line met / not met / unverifiable. |

### Tier 3 - Manager / Release

| Role | Agent | One-line task |
| --- | --- | --- |
| Release Engineer | [release-engineer](agents/release-engineer.md) | Orchestrates one release runbook (smoke gate, canary deploy, metric thresholds, rollout/rollback) pausing at every human decision point. |
| QA Manager | [qa-manager](agents/qa-manager.md) | Generates a weekly RAG quality-status digest from CI history, defect tracker, and flake-quarantine state. |

### Tier 4 - Head / Director

| Role | Agent | One-line task |
| --- | --- | --- |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-roles@testland-qa
```
