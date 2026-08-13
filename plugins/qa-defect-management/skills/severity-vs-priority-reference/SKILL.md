---
name: severity-vs-priority-reference
description: "Pure-reference catalog for defect classification: severity (impact on the system / user) vs priority (urgency of fix) on independent axes - the canonical 5-point severity scale (Critical / High / Medium / Low / Trivial), the 5-point priority scale (Immediate / High / Medium / Low / Deferred), the 5x5 matrix with worked S1/P5 and S5/P1 examples, and IEEE 1044-2009 severity classes; plus the full defect lifecycle (ISTQB-canonical states new / open / assigned / fixed / verified / closed / reopened / deferred / rejected / duplicate, allowed and forbidden transitions, tracker vocabulary maps) and the defect-categorisation taxonomies (IEEE 1044 anomaly classification, ISTQB CTAL-TA root-cause categories, Orthogonal Defect Classification) in references. Use when triaging or classifying a defect, configuring a tracker's severity/priority/state fields, reviewing a bug report's classification, or running root-cause analysis."
---

# severity-vs-priority-reference

## Overview

Severity and priority are **two independent axes**, not synonyms.
Every triaged defect must have both, and the combination drives
scheduling, escalation, and SLA enforcement.

- **Severity** measures how badly the defect breaks the system /
  user when triggered. It's an objective property of the defect.
- **Priority** measures how urgently the fix must land. It's a
  scheduling decision, influenced by severity but also by
  business context (customer commitments, regulatory deadlines,
  release timing).

This skill is a **pure reference** consumed by defect-report
review (which rejects reports that conflate the two),
`bug-tracker-workflow`, and downstream triage tooling. Two
companion references extend it: the defect **lifecycle** (states,
allowed / forbidden transitions, tracker vocabulary) in
[references/lifecycle.md](references/lifecycle.md), and the
**categorisation taxonomies** (IEEE 1044, ISTQB CTAL-TA root
cause, ODC) in [references/taxonomy.md](references/taxonomy.md).

## When to use

- Reviewing whether a bug report's severity + priority are both
  set and consistent with the defect description.
- Configuring a tracker's severity / priority field options.
- Coaching a tester / triager on the distinction.
- Checking a state transition against the canonical lifecycle
  (see [references/lifecycle.md](references/lifecycle.md)).
- Categorising defects for root-cause analysis or process metrics
  (see [references/taxonomy.md](references/taxonomy.md)).

## How to use

1. Read the defect and decide what function it breaks and how badly;
   pick a **severity** (S1-S5) from the severity scale anchors.
2. Separately weigh how urgently the fix must land given business
   context; pick a **priority** (P1-P5) from the priority scale.
3. Locate the pair in the 5x5 matrix; if the cell is "rare" or
   "unusual", record an explicit rationale for the combination.
4. Confirm you did not collapse the axes (do not force P1 just
   because severity is S1) - the two values are independent.
5. Set the tracker's severity and priority fields per the
   configuring-a-tracker table for your platform.
6. On any later re-triage (state change), keep severity fixed and
   revisit priority only.
7. Log every priority change with its rationale.

## The two axes

### Severity scale

Per IEEE 1044-2009 (cite by stable ID; "Standard Classification
for Software Anomalies") and ISTQB CTFL syllabus:

| Severity | Definition | Example |
|---|---|---|
| **Critical** (S1) | System unusable; data loss; security breach; total loss of function. | Production database is corrupted on user signup. |
| **High** (S2) | Major function broken; significant user impact; no easy workaround. | Checkout fails 30 % of the time; no workaround. |
| **Medium** (S3) | A function works incorrectly; usable workaround exists; impact bounded. | Date picker shows wrong month abbreviations; users can type the date. |
| **Low** (S4) | Cosmetic or minor inconvenience; functionality not impaired. | Footer copyright year not updated. |
| **Trivial** (S5) | Spelling, alignment, polish-level issues. | "Settngs" link misspelled in sidebar. |

Per ISTQB Glossary "severity" entry
([glossary.istqb.org](https://glossary.istqb.org/)): "the degree
of impact that a defect has on the development or operation of a
component or system."

### Priority scale

Per ISTQB Glossary "priority": "the level of (business)
importance assigned to an item, e.g., a defect."

| Priority | Definition | Example |
|---|---|---|
| **Immediate / Blocker** (P1) | Stop the release; halt downstream work until fixed. | Production outage; security incident in progress. |
| **High** (P2) | Fix in current sprint / before next release. | Customer-reported high-severity bug. |
| **Medium** (P3) | Fix when capacity permits in coming sprints. | Medium-severity bug with workaround. |
| **Low** (P4) | Backlog; fix opportunistically. | Low-severity, no customer impact. |
| **Deferred** (P5) | Won't fix in foreseeable horizon. | Cosmetic in deprecated feature. |

## Why they must be separate axes

The "combined severity-priority" scale is a common anti-pattern.
Each cell in the 5×5 matrix below represents a real combination:

| | P1 Immediate | P2 High | P3 Medium | P4 Low | P5 Deferred |
|---|:---:|:---:|:---:|:---:|:---:|
| **S1 Critical** | typical | unusual but real | rare | rare | rare |
| **S2 High** | typical | typical | typical | rare | rare |
| **S3 Medium** | unusual | typical | typical | typical | unusual |
| **S4 Low** | unusual | unusual | typical | typical | typical |
| **S5 Trivial** | unusual (PR demo!) | rare | unusual | typical | typical |

**Worked examples that prove the distinction**:

- **S1 / P5** (Critical / Deferred) - Real defect: a security
  vulnerability in a legacy system scheduled for deprecation
  next quarter. Severity is objectively Critical (the bug, if
  triggered, breaks the system) but priority is Deferred (the
  whole subsystem is being removed; patching it is wasteful).
  Action: track + monitor; if exploited before deprecation,
  re-prioritise.

- **S5 / P1** (Trivial / Immediate) - Real defect: a typo on the
  hero copy of the marketing site that says "Bweekly" instead of
  "Biweekly," and the CEO just shared the page on LinkedIn.
  Severity is objectively Trivial (no function broken) but
  priority is Immediate (PR / brand impact).

- **S2 / P3** (High / Medium) - Real defect: checkout intermittently
  fails for a specific bank's cards (3 % of transactions),
  workaround = use a different card. Severity is High (major
  function impaired), priority is Medium (workaround exists +
  no SLA breach yet).

- **S3 / P1** (Medium / Immediate) - Real defect: a regression
  surfaced 4 hours before a marketing email lands that mentions
  the feature. Severity is Medium (function works in 90 % of
  cases) but priority is Immediate (marketing dependency).

## Worked example

A CSV export appends one trailing blank column for every user. The
export still succeeds and every data value is correct.

1. Severity: the function works and data is intact; the defect is a
   cosmetic formatting flaw -> **S4 Low** (functionality not impaired).
2. Priority: a major enterprise customer's ingestion pipeline breaks
   on the extra column, and their renewal is next week -> **P2 High**
   (business commitment, near-term deadline).
3. Matrix check: the pair is **S4 / P2** - an "unusual" cell, so log
   the rationale (customer renewal dependency).
4. Set Jira `Severity = Low`, `Priority = High`; do not bump severity
   to justify the urgency.

Result: the fix is scheduled in the current sprint despite Low
severity, driven entirely by the High priority - a clean demonstration
that the two axes move independently.

## Mapping to lifecycle

Severity and priority don't change with state (typically).
However:

- **Re-triage** at state change: when a deferred defect resurfaces
  as a production failure, severity is unchanged but priority
  jumps.
- **Severity escalation rules**: many trackers auto-bump priority
  if severity is S1/S2. The platform-workflow skills configure
  these.
- **SLA driven by priority**: P1 = e.g., 4-hour response, P2 = 1
  business day, P3 = 1 week. SLAs are tracker config, not
  severity-derived.

See [references/lifecycle.md](references/lifecycle.md)
for the state transitions; this skill defines the orthogonal
severity / priority fields.

## Common confusions

| Confusion | Reality |
|---|---|
| "Severity = customer impact." | Severity = **system function impact**. Customer impact informs priority. A bug that breaks an unused admin tool is High severity but Low priority. |
| "Priority always equals severity." | False. The 5×5 matrix has 25 distinct cells, all observed in practice. |
| "Critical defects always get fixed immediately." | False. A Critical defect in a deprecated subsystem may be Deferred. |
| "Cosmetic = Low / Trivial severity always Low priority." | False. Marketing context (S5 / P1 example above) can make trivial severity an immediate priority. |
| "Severity is set by the reporter; priority by the PM." | Convention varies. Best practice: reporter proposes severity; triager confirms severity + assigns priority. |

## Configuring a tracker

| Tracker | Severity field | Priority field |
|---|---|---|
| Jira | Custom field (often `Severity` with select-list) | Built-in `Priority` field |
| Linear | Custom field (Severity), no first-class | Built-in `Priority` field (Urgent / High / Medium / Low / No priority) |
| GitHub Issues | Labels (`severity:critical` etc.) | Labels (`priority:p1` etc.) + Projects status |
| Azure DevOps | Built-in `Severity` (1 - Critical / 2 - High / 3 - Medium / 4 - Low) | Built-in `Priority` (1 / 2 / 3 / 4) |
| Bugzilla | Built-in `Severity` + `Priority` | Same |

`bug-tracker-workflow` covers the platform-specific configuration
for Jira, Linear, GitHub Issues, and Azure DevOps.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Single combined field | Loses information; everyone fights about whether to bump severity to escalate or vice versa | Two fields, explicit per defect |
| Default both fields to "Medium" | Triagers don't engage with the distinction | Require both fields explicitly on transition from New → Open |
| Auto-equate severity with priority | "S1 must be P1" - disallows S1/P5 deferred legacy bugs | Allow both axes independently |
| Severity is purely subjective | Variability across reporters; metrics unreliable | Use the IEEE 1044 examples + team-calibrated rubric |
| Priority changes weekly without reason | Metrics chaos; no accountability | Log priority changes with rationale |
| Critical defects always escalated to release manager | Floods the escalation channel | Use severity *and* priority for escalation rules |

## Limitations

- **Subjectivity remains.** Severity has objective anchors (S1 =
  data loss, S5 = cosmetic) but boundary cases (S2 vs S3 with a
  workaround) require judgment. Reviewer disagreement is normal.
- **Priority is a moving target.** Business context shifts
  weekly; a P3 today may be P1 next sprint after a customer
  escalation.
- **Severity classes vary by tracker.** Some use 4-point scales
  (Bugzilla), some 5 (Azure DevOps), some define their own. The
  team must pick one and document it.
- **No automation can fully classify severity.** AI classifiers
  can suggest, but the final call needs a human in the loop.

## References

- ISTQB Glossary - "severity" and "priority" entries - 
  [glossary.istqb.org](https://glossary.istqb.org/).
- IEEE 1044-2009 "Standard Classification for Software Anomalies" - cite by stable ID; canonical severity classification.
- ISO/IEC/IEEE 29119-3:2021 §6 anomaly-report fields - cite by
  stable ID.
- Atlassian "Configure priority levels" - Jira priority docs.
- Linear "Priority levels" - Linear priority docs.
- GitHub Issues - labels + Projects status documentation.
- Companion references:
  [references/lifecycle.md](references/lifecycle.md),
  [references/taxonomy.md](references/taxonomy.md),
  [references/tracker-vocabulary-map.md](references/tracker-vocabulary-map.md).
