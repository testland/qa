---
name: bug-lifecycle-reference
description: "Pure-reference catalog of defect lifecycle states and transitions. Defines the ISTQB-canonical states (new / open / assigned / in-progress / fixed / verified / closed / reopened / deferred / rejected / duplicate) and the transitions between them, distinguishes the ISTQB terms (error → fault / defect → failure), maps the lifecycle to the standard Jira / Linear / GitHub Issues workflows, and cites IEEE 1044-2009 and ISO/IEC/IEEE 29119-3 for the canonical anchors. Use as the lifecycle vocabulary for the bug-report-critic, duplicate-defect-finder, and the platform-workflow skills."
rating: 24
d6: 4
archetype: S2
---

# bug-lifecycle-reference

Catalogs the ISTQB-canonical defect lifecycle and maps it to Jira,
Linear, and GitHub Issues workflows. Consumed by the
platform-workflow skills
([`jira-bug-workflow-runner`](../jira-bug-workflow-runner/SKILL.md),
[`linear-bug-workflow-runner`](../linear-bug-workflow-runner/SKILL.md),
[`github-issues-bug-workflow`](../github-issues-bug-workflow/SKILL.md))
for state-transition logic.

## When to use

- Aligning a team's tracker configuration with the ISTQB-canonical
  vocabulary.
- Reviewing a bug report's current state against expected
  transitions (e.g., is "Closed" appropriate before verification?).
- Onboarding a tester to the vocabulary used by
  [`bug-report-critic`](../../agents/bug-report-critic.md).

## ISTQB terms — error, fault, defect, failure, anomaly

Per the ISTQB Glossary
([glossary.istqb.org](https://glossary.istqb.org/)):

| Term | Definition |
|---|---|
| **Error** | A human action that produces an incorrect result. |
| **Fault** (synonyms: defect, bug) | A manifestation of an error in software. |
| **Defect** | An imperfection or deficiency in a work product where it does not meet its requirements or specifications. Synonyms: bug, fault, problem. |
| **Failure** | An event in which a component or system does not perform a required function within specified limits. Failure is what users experience; fault is what produced it. |
| **Anomaly** | Any condition that deviates from expectation. Broader than defect — could be a usability issue, a documentation gap, or a defect. |

These terms are surprisingly often misused: developers say "the
bug failed in production" when they mean "the **failure**, caused
by the **fault**, occurred in production." The lifecycle below
tracks defects (faults), not failures (events).

## Canonical lifecycle states

The standard set per IEEE 1044-2009 "Standard Classification for
Software Anomalies" and ISO/IEC/IEEE 29119-3:2021 "Test
documentation":

| State | Meaning | Typical owner |
|---|---|---|
| **New** | Just reported. Not yet triaged. | Reporter |
| **Open** (or **Acknowledged**) | Triaged; confirmed as a real defect. | Triage lead |
| **Assigned** | A developer / team owns it. | Engineering manager |
| **In Progress** | Active investigation / fix. | Assigned developer |
| **Fixed** (or **Resolved**) | Code change merged; awaiting verification. | Assigned developer |
| **Verified** (or **Tested**) | A tester confirmed the fix. | QA |
| **Closed** | Defect lifecycle complete. | Release manager / QA |
| **Reopened** | Verification failed; back to assigned. | QA / Reporter |
| **Deferred** | Real defect, fix postponed (next release / never). | Product manager |
| **Rejected** (or **Not a Bug**) | Triage concluded this isn't a defect (misuse, by design, dup). | Triage lead |
| **Duplicate** | Already tracked as another defect. Link to canonical. | Triage lead |

Cite: ISO/IEC/IEEE 29119-3:2021 §6 "Test documentation — Anomaly
report" — section enumerates the recommended fields and lifecycle
states. Cite by stable ID; full text behind iso.org paywall.

## State transition diagram

```
                +-----+
                | New |
                +-----+
                   |
       triage      |  (or reject / dup)
                   v
   +-----------+       +-----------+
   |   Open    |------>| Rejected  |
   +-----------+       +-----------+
        |                     ^
        |                     |
   assign                     |
        v                     |
   +-----------+              |
   | Assigned  |              |
   +-----------+              |
        |                     |
        v                     |
   +-----------+   defer +-----------+
   |In Progress|-------->| Deferred  |
   +-----------+         +-----------+
        |
        v
   +-----------+
   |   Fixed   |
   +-----------+
        |
   verify
        |
        +------- fail ----+
        |                 |
        v                 v
   +-----------+   +-----------+
   | Verified  |   | Reopened  |
   +-----------+   +-----------+
        |                 |
        v          assigned (back to In Progress)
   +-----------+
   |  Closed   |
   +-----------+
```

**Allowed transitions** (defensible):

| From | Allowed → |
|---|---|
| New | Open, Rejected, Duplicate |
| Open | Assigned, Deferred, Rejected |
| Assigned | In Progress, Deferred, Reopened |
| In Progress | Fixed, Deferred |
| Fixed | Verified, Reopened |
| Verified | Closed, Reopened (rare — late finding) |
| Reopened | Assigned, In Progress |
| Deferred | Open, Closed (wontfix) |

**Forbidden transitions** (smells):

- New → Closed (skips triage + verification — only legitimate for
  spam / duplicate where triager catches it immediately)
- Assigned → Closed (no fix, no verification — what was closed?)
- Fixed → Closed without Verified (no verification — possibly the
  fix never worked)
- Closed → anything except Reopened (reopening is the only way back)

## Tracker-vocabulary map

The canonical lifecycle maps to platform-specific terminology:

| ISTQB / IEEE | Jira (default workflow) | Linear (default workflow) | GitHub Issues (default + Projects) |
|---|---|---|---|
| New | To Do | Backlog | Open + label `triage` |
| Open | In Triage (custom) | Todo | Open + label `confirmed` |
| Assigned | (Assignee set) | In Progress + assignee | Open + assignee |
| In Progress | In Progress | In Progress | Open + linked PR draft |
| Fixed | In Review | In Review | Open + linked PR ready |
| Verified | Done (pre-release) | Done | Closed (PR merged) — but often kept Open until verified |
| Closed | Done | Done | Closed |
| Reopened | Reopened | Reopened (custom) | Reopened |
| Deferred | Won't Do (deferred subtype) | Cancelled (with reason) | Closed not-planned |
| Rejected | Won't Do / Cannot Reproduce | Cancelled with reason | Closed not-planned + label `not-a-bug` |
| Duplicate | Resolved as Duplicate (link to canonical) | Cancelled with `Duplicate of:` link | Closed + comment `Duplicate of #N` |

Per the platform docs (Atlassian "Issue workflow", Linear "Workflow
states", GitHub "Issue templates"):

- Jira workflow is **fully configurable** — the table reflects the
  default Software project template.
- Linear workflow states are **fixed enums** (Backlog, Todo, In
  Progress, In Review, Done, Cancelled) but each can be subdivided
  per team.
- GitHub Issues has only **Open / Closed** as states; richer
  lifecycle requires Projects (status column) + labels.

## Recommended state-transition guardrails

The platform-workflow skills enforce these:

| Guardrail | Rule |
|---|---|
| Triage SLA | New → Open or Rejected within 1 business day |
| Verification gate | Fixed → Closed must pass via Verified |
| Reopen audit | Reopened transitions are tracked; >3 reopens on the same defect signals fix-quality issues |
| Deferred review | Deferred items reviewed at sprint planning; auto-expire to Closed (wontfix) after N sprints |
| Duplicate linking | Duplicate transitions require `duplicate_of:` link to canonical |

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| "Closed" used as "Done" without verification | Defect re-emerges in production | Require Verified → Closed transition |
| All defects start in "Assigned" with no triage | Triage data lost; metrics unreliable | New → Open → Assigned (triage step is informative) |
| Reopened defects re-counted as new in metrics | Inflates inflow / understates fix quality | Distinguish New vs Reopened in dashboards |
| Deferred = forgotten | Deferred items accumulate; technical debt | Deferred review at every sprint planning |
| Multiple "Open" subtypes ("In Triage", "Triaged", "Confirmed") | Workflow becomes opaque; reporters don't know which state means what | Collapse to fewer states; use fields for nuance |
| Direct New → Closed by triage | Lost signal — was it spam? duplicate? rejected? | Always transition through a meaningful state |
| Different teams use different workflows in the same tracker | Cross-team metrics impossible | Standardise to the canonical lifecycle above |

## Limitations

- **Workflow customisation is the norm.** Real-world Jira /
  Linear configurations often add custom states (UX Review, Legal
  Review, Customer Confirmation). The canonical lifecycle is the
  *floor*, not the ceiling.
- **State enumeration vs. label-based.** GitHub Issues' Open /
  Closed binary is impoverished; teams supplement with labels and
  Projects status columns. This reference treats the *effective*
  lifecycle (state + label + assignee) as a single concept.
- **The terms "bug" and "defect" remain interchangeable in
  practice.** ISTQB makes the distinction sharp; most trackers
  don't. Adopt the canonical vocabulary or accept the colloquial
  use — but don't mix midstream.
- **Severity / priority are separate axes.** State doesn't
  capture how bad / how urgent. See
  [`severity-vs-priority-reference`](../severity-vs-priority-reference/SKILL.md).

## References

- ISTQB Glossary —
  [glossary.istqb.org](https://glossary.istqb.org/). Canonical
  definitions of error / fault / defect / failure / anomaly.
- IEEE 1044-2009 "Standard Classification for Software Anomalies"
  — cite by stable ID; defines defect lifecycle.
- ISO/IEC/IEEE 29119-3:2021 "Software and systems engineering —
  Software testing — Part 3: Test documentation" §6 — defines
  anomaly-report fields and lifecycle.
- Atlassian "Configure issue workflows" — Jira default workflows.
- Linear documentation "Workflow states" — fixed enum + per-team
  subdivision.
- GitHub Issues docs — Open / Closed + labels + Projects.
- Sibling references in this plugin:
  [`severity-vs-priority-reference`](../severity-vs-priority-reference/SKILL.md),
  [`defect-taxonomy-istqb`](../defect-taxonomy-istqb/SKILL.md).
- Consumed by:
  [`bug-report-critic`](../../agents/bug-report-critic.md),
  [`bug-report-from-failure`](../bug-report-from-failure/SKILL.md),
  and platform-workflow skills.
- Sibling-plugin neighbour:
  [`bug-report-template`](../../../qa-bug-repro/skills/bug-report-template/SKILL.md)
  (qa-bug-repro is reproduction-focused; this plugin is workflow /
  lifecycle / taxonomy-focused).
