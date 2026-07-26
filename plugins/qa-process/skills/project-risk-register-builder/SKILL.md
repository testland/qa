---
name: project-risk-register-builder
description: "Build-an-X workflow producing a project-level risk register - risks to project execution (schedule slippage, environment instability, people / staffing, vendor / dependency, scope creep) rather than the product itself. Walks the author through ISO 31000-aligned identification, impact × likelihood scoring, mitigation strategy (avoid / mitigate / transfer / accept), and ownership; the project manager reviews it weekly. Use for release-execution risk. For product-quality risks use product-risk-register-builder, for the per-release product risk table use risk-matrix, and to sign off accepting one specific risk use risk-acceptance-decision-author."
---

# project-risk-register-builder

## Overview

A **project risk register** captures risks to **project execution** - schedule, environment, people, vendor, scope - separate from
product-quality risks. Per ISTQB CTAL-TM, the distinction is:

- **Product risk** - "the possibility that the system or software
  might fail to satisfy or fulfil some reasonable expectation of
  the customer, user, or stakeholder." → captured in
  `product-risk-register-builder`
  and per-release in
  `risk-matrix`.
- **Project risk** - "any risk that affects project success."
  Schedule, resources, etc.

This skill scopes **project** risks. Cite ISTQB glossary
([glossary.istqb.org](https://glossary.istqb.org/)) "product
risk" + "project risk".

## When to use

- Sprint planning - capture sprint-specific project risks.
- Release planning - capture release execution risks (deadlines,
  dependencies, staffing).
- Quarterly OKR review - capture longer-horizon project risks.
- Project kickoff - establish the baseline.

## Step 1 - Identify by category

Per ISO 31000:2018 (cite by stable ID) and PMI PMBOK 7th edition
risk categorisation, project risks fall into broad buckets:

| Category | Example risks |
|---|---|
| **Schedule** | Estimate uncertainty; downstream dependency slippage; holiday / OOO clashes |
| **People / staffing** | Key engineer leaves; on-call rotation under-staffed; specialist knowledge concentrated |
| **Scope** | Scope creep mid-sprint; spec ambiguity; stakeholder mid-flight changes |
| **Environment / infrastructure** | Staging environment broken; CI / test infrastructure outage |
| **Vendor / third-party** | API deprecation by vendor; vendor SLA breach; cloud-provider regional outage |
| **Compliance / regulatory** | Audit deadline missed; new regulation in flight (e.g., GDPR, SOC 2) |
| **Budget** | Cloud-spend overrun; tool licensing surprise |
| **Communication** | Cross-team alignment failures; missing stakeholder sign-off |

Aim for 8-20 active project risks at any time. Stale entries get
retired.

## Step 2 - Score per impact × likelihood

```
Impact 1-5:
  1 = Minor delay / inconvenience
  2 = Multi-day delay; small re-work
  3 = Sprint slippage; significant re-work
  4 = Release slippage; major re-plan
  5 = Quarter slippage; reputation / financial damage

Likelihood 1-5:
  1 = Very unlikely (<10% in horizon)
  2 = Unlikely (~25%)
  3 = Possible (~50%)
  4 = Likely (~75%)
  5 = Very likely (>90%)

Score = Impact × Likelihood (range 1-25)
```

## Step 3 - Pick a mitigation strategy

Per ISO 31000:2018, four standard responses:

| Strategy | When | Example |
|---|---|---|
| **Avoid** | Risk is so high that the project scope is reshaped to remove it | Decline a Q4 launch that requires a known-fragile dependency |
| **Mitigate** | Reduce likelihood or impact via active intervention | Add a staging-mirror to reduce dependency-outage risk |
| **Transfer** | Shift the risk via contract / insurance / outsourcing | Vendor contract clause for SLA breach; insurance policy |
| **Accept** | Document + monitor; act when (if) it triggers | Note a Q1 holiday-staffing risk; OOO calendar visible |

Document the chosen strategy per risk.

## Step 4 - Document the register

```markdown
# Project risk register - <project / quarter>

**Last reviewed:** YYYY-MM-DD  **Owner:** <PM>  **Next review:** YYYY-MM-DD

## Active risks (n=11)

| ID | Category | Risk | Impact | Likelihood | Score | Strategy | Mitigation | Owner | Status |
|---|---|---|---:|---:|---:|---|---|---|---|
| PJ-001 | Schedule | Q2 launch depends on Stripe migration; Stripe rate-limits doc work | 4 | 3 | 12 | Mitigate | Run migration in parallel with team-2 work | Alice | Active |
| PJ-002 | People | Senior payments engineer on parental leave Q2 | 4 | 5 | 20 | Mitigate | Knowledge-transfer sessions Q1; pair-coding | Bob | Active |
| PJ-003 | Vendor | Auth0 deprecating legacy SDK Q3 | 3 | 5 | 15 | Mitigate | Migrate to new SDK Q2 (1 sprint allocated) | Carol | Active |
| PJ-004 | Compliance | SOC 2 Type II audit Q3 - controls evidence collection backlog | 5 | 3 | 15 | Mitigate | Hire compliance contractor; start collection Q1 | Dan | Active |
| PJ-005 | Environment | Staging cluster autoscale unreliable | 3 | 4 | 12 | Mitigate | Migrate staging to k8s-autopilot Q2 | Eve | Active |
| PJ-006 | Scope | "AI feature" spec drifting in stakeholder reviews | 3 | 4 | 12 | Mitigate | Lock spec by end Q1; weekly stakeholder review | Fran | Active |
| PJ-007 | Schedule | Cyber-week launch window non-negotiable | 5 | 2 | 10 | Mitigate + Accept | Buffer + war-room ready | Alice | Active |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |

## Retired / triggered risks (n=4)

| ID | Risk | Outcome | Lessons |
|---|---|---|---|
| PJ-R-001 | DB migration vendor delay | Triggered Q1; mitigated by parallel path | Two-vendor strategy works |
| PJ-R-002 | Staffing - onboarding lag | Not triggered | Mitigation (early hire) effective |
```

## Step 5 - Weekly review cadence

Project risks evolve fast. Weekly review at standup or PM
syncpoint:

```markdown
## Week of YYYY-MM-DD review

- **PJ-002** (key engineer leave): KT session 3/4 complete. Score
  unchanged.
- **PJ-003** (Auth0 SDK): migration started; likelihood drops 5 → 3.
  New score: 9 (was 15).
- **New PJ-012**: Cloud provider regional outage (us-east-1) on
  YYYY-MM-DD reminded us of single-region risk. Impact 4,
  likelihood 2, score 8. Strategy: monitor.
- **Triggered PJ-007** (Cyber-week launch): launched successfully;
  retire.
```

## Step 6 - Escalation triggers

Risks scoring ≥15 trigger escalation:

```markdown
## Escalations this week

- **PJ-002** (score 20): Engineering Director informed.
  Mitigation status: 3/4 KT sessions held; remaining pair-coding
  blocked on engineer availability.
```

## Worked example - quarterly project risk distribution

For a 12-risk register in a Q2 release:

| Category | Count | Avg score | Highest |
|---|---:|---:|---:|
| Schedule | 3 | 13 | 16 |
| People | 2 | 16 | 20 |
| Vendor | 2 | 12 | 15 |
| Scope | 2 | 11 | 12 |
| Environment | 2 | 10 | 12 |
| Compliance | 1 | 15 | 15 |

People + Schedule are dominant - staffing + dependency
mitigations need most attention.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Mixing project + product risks in one register | Confuses risk-response strategies | Separate registers; this for project, `product-risk-register-builder` for product |
| "Mitigate" is the only strategy | "Accept" is legitimate; not every risk needs an action | Use all 4 strategies (Avoid / Mitigate / Transfer / Accept) |
| Weekly review skipped during crunch | Risks compound when ignored | Hold review even briefly; stale register is worse than no register |
| No retired-risks log | Lose lessons learned | Always keep retired list |
| Score 25 without escalation | Owner alone can't manage critical risks | Escalation rule per Step 6 |
| Mitigation without owner | Risk floats; no one accountable | Always name an owner |
| Status column missing | Can't tell if mitigation is on track | "Active / In progress / Mitigated / Triggered / Retired" status |

## Limitations

- **Project risks evolve fast.** Weekly review is the floor; some
  risks need daily attention.
- **Scoring is judgmental.** Project context differs by team /
  industry / org maturity.
- **Doesn't replace project plan.** Risks supplement the plan;
  they don't replace it.
- **"Transfer" via vendor contract** is often theoretical - 
  contract clauses without enforcement don't actually transfer
  risk.

## References

- ISO 31000:2018 "Risk management - Guidelines" - cite by stable
  ID; iso.org paywall.
- PMI PMBOK Guide 7th edition - risk management chapter.
- ISTQB Advanced Test Manager (CTAL-TM) syllabus, ch. 5.
- ISTQB Glossary - 
  [glossary.istqb.org](https://glossary.istqb.org/) - "project
  risk" entry.
- Sibling skill (different scope):
  `product-risk-register-builder`,
  `risk-matrix`.
