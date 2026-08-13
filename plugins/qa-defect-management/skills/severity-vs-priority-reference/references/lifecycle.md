# Defect lifecycle states and transitions

Reference companion to `severity-vs-priority-reference`. Catalogs the
ISTQB-canonical defect lifecycle and maps it to Jira, Linear, and GitHub
Issues workflows. Consumed by `bug-tracker-workflow` for state-transition
logic.

## How to use

1. Read the defect's current tracker state and map it to a canonical
   state via [tracker-vocabulary-map.md](tracker-vocabulary-map.md).
2. Find that canonical state in the allowed-transitions table.
3. Check the proposed next state is in the allowed set; if it matches
   a forbidden transition (New -> Closed, Fixed -> Closed without
   Verified), flag it.
4. Apply the guardrails (triage SLA, verification gate, reopen audit,
   duplicate / deferred linking) before recording the move.
5. Confirm ISTQB term usage is correct (fault vs failure) in the
   report wording.
6. Record the transition; for Duplicate / Deferred / Rejected attach
   the required link or reason.
7. For metrics, count Reopened separately from New inflow.

## ISTQB terms - error, fault, defect, failure, anomaly

Per the ISTQB Glossary
([glossary.istqb.org](https://glossary.istqb.org/)):

| Term | Definition |
|---|---|
| **Error** | A human action that produces an incorrect result. |
| **Fault** (synonyms: defect, bug) | A manifestation of an error in software. |
| **Defect** | An imperfection or deficiency in a work product where it does not meet its requirements or specifications. Synonyms: bug, fault, problem. |
| **Failure** | An event in which a component or system does not perform a required function within specified limits. Failure is what users experience; fault is what produced it. |
| **Anomaly** | Any condition that deviates from expectation. Broader than defect - could be a usability issue, a documentation gap, or a defect. |

These terms are surprisingly often misused: developers say "the bug failed
in production" when they mean "the **failure**, caused by the **fault**,
occurred in production." The lifecycle below tracks defects (faults), not
failures (events).

## Canonical lifecycle states

The standard set per IEEE 1044-2009 "Standard Classification for Software
Anomalies" and ISO/IEC/IEEE 29119-3:2021 "Test documentation":

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

Cite: ISO/IEC/IEEE 29119-3:2021 §6 "Test documentation - Anomaly report" -
section enumerates the recommended fields and lifecycle states. Cite by
stable ID; full text behind iso.org paywall.

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
| Verified | Closed, Reopened (rare - late finding) |
| Reopened | Assigned, In Progress |
| Deferred | Open, Closed (wontfix) |

**Forbidden transitions** (smells):

- New → Closed (skips triage + verification - only legitimate for
  spam / duplicate where triager catches it immediately)
- Assigned → Closed (no fix, no verification - what was closed?)
- Fixed → Closed without Verified (no verification - possibly the
  fix never worked)
- Closed → anything except Reopened (reopening is the only way back)

## Tracker-vocabulary map

The canonical lifecycle maps to platform-specific terminology across Jira,
Linear, and GitHub Issues, with per-platform notes on how configurable each
tracker's states are. See the full cross-platform table in
[tracker-vocabulary-map.md](tracker-vocabulary-map.md).

## Recommended state-transition guardrails

Enforced by `bug-tracker-workflow` automation:

| Guardrail | Rule |
|---|---|
| Triage SLA | New → Open or Rejected within 1 business day |
| Verification gate | Fixed → Closed must pass via Verified |
| Reopen audit | Reopened transitions are tracked; >3 reopens on the same defect signals fix-quality issues |
| Deferred review | Deferred items reviewed at sprint planning; auto-expire to Closed (wontfix) after N sprints |
| Duplicate linking | Duplicate transitions require `duplicate_of:` link to canonical |

## Worked example

A Jira ticket sits in **In Review** and a developer wants to drag it
straight to **Done**.

1. Map the tracker state: In Review -> canonical **Fixed** (per
   [tracker-vocabulary-map.md](tracker-vocabulary-map.md));
   Done -> canonical **Closed**.
2. The requested move is therefore Fixed -> Closed.
3. Check the allowed-transitions table: Fixed allows only **Verified**
   or **Reopened**. Fixed -> Closed is a forbidden transition ("Fixed
   -> Closed without Verified").
4. Apply the verification gate guardrail: a tester must confirm the
   fix first, moving it to Verified.

Result: block the drag to Done, route the ticket to a QA verification
step, and only allow Verified -> Closed once the fix is confirmed.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| "Closed" used as "Done" without verification | Defect re-emerges in production | Require Verified → Closed transition |
| All defects start in "Assigned" with no triage | Triage data lost; metrics unreliable | New → Open → Assigned (triage step is informative) |
| Reopened defects re-counted as new in metrics | Inflates inflow / understates fix quality | Distinguish New vs Reopened in dashboards |
| Deferred = forgotten | Deferred items accumulate; technical debt | Deferred review at every sprint planning |
| Multiple "Open" subtypes ("In Triage", "Triaged", "Confirmed") | Workflow becomes opaque; reporters don't know which state means what | Collapse to fewer states; use fields for nuance |
| Direct New → Closed by triage | Lost signal - was it spam? duplicate? rejected? | Always transition through a meaningful state |
| Different teams use different workflows in the same tracker | Cross-team metrics impossible | Standardise to the canonical lifecycle above |

## Limitations

- **Workflow customisation is the norm.** Real-world Jira / Linear
  configurations often add custom states (UX Review, Legal Review, Customer
  Confirmation). The canonical lifecycle is the *floor*, not the ceiling.
- **State enumeration vs. label-based.** GitHub Issues' Open / Closed
  binary is impoverished; teams supplement with labels and Projects status
  columns. This reference treats the *effective* lifecycle (state + label +
  assignee) as a single concept.
- **The terms "bug" and "defect" remain interchangeable in practice.**
  ISTQB makes the distinction sharp; most trackers don't. Adopt the
  canonical vocabulary or accept the colloquial use - but don't mix
  midstream.

## References

- ISTQB Glossary - [glossary.istqb.org](https://glossary.istqb.org/).
  Canonical definitions of error / fault / defect / failure / anomaly.
- IEEE 1044-2009 "Standard Classification for Software Anomalies" - cite by
  stable ID; defines defect lifecycle.
- ISO/IEC/IEEE 29119-3:2021 "Software and systems engineering - Software
  testing - Part 3: Test documentation" §6 - defines anomaly-report fields
  and lifecycle.
- Atlassian "Configure issue workflows" - Jira default workflows.
- Linear documentation "Workflow states" - fixed enum + per-team
  subdivision.
- GitHub Issues docs - Open / Closed + labels + Projects.
