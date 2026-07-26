---
name: session-based-test-management-reference
description: "Pure-reference catalog of Session-Based Test Management (SBTM) - the Bachs' framework for running exploratory testing as time-boxed sessions: the session (60-90 min), the charter (Explore X with Y to discover Z), the session-sheet structure, the TBS metrics, the cross-session dashboard, and the PROOF debrief. Use as the SBTM vocabulary for authoring charters and reviewing session sheets. Distinct from manual-test-debrief (the PROOF debrief template), exploratory-tours-reference (the session themes), and the heuristic catalog hiccupps-f-heuristic."
---

# session-based-test-management-reference

## Overview

Session-Based Test Management (SBTM) is the dominant framework
for managing exploratory testing as a measurable, accountable
activity. It was developed by Jonathan Bach + James Bach
(1999-2000) and is documented at
[satisfice.com/sbtm](https://www.satisfice.com/exploratory-testing).

The unit of work is a **session** - a time-boxed (60-90 min)
chunk of focused exploratory testing against a mission stated as
a **charter**. Sessions produce **session sheets** that capture
what happened in a structured-enough format for management to
aggregate, while leaving room for the tester to learn freely.

This skill is a **pure reference** consumed by
`manual-test-debrief` and the
tour-catalogues
(`exploratory-tours-reference`).

For the canonical heuristic catalogs the tester applies during a
session, see
`hiccupps-f-heuristic`,
`sfdpot-exploratory-heuristic`,
`fcc-cuts-vids-heuristic`,
`crusspic-stmpl-heuristic`.

## When to use

- Onboarding a tester to SBTM vocabulary.
- Authoring a charter - what fields belong, what mission framing
  to use.
- Reviewing a session sheet for completeness.
- Building a session-tracking dashboard.

## How to use

1. **Write the charter** - "Explore <area> with <tools> to discover
   <information>". Keep it a mission, not a test-case list.
2. **Time-box the session** - 60-90 min, one charter, uninterrupted;
   ~2-hour hard cap before focus degrades.
3. **Test and record** - explore per the charter (applying tours +
   heuristics) and log Areas, Bugs, and Issues in the session sheet as
   you go. Full template:
   [references/session-sheet-and-metrics.md](references/session-sheet-and-metrics.md).
4. **Track TBS** - note the Test / Bug / Setup split (plus Opportunity /
   Idle). A session under ~50% T signals an environment or scope
   problem.
5. **Close with PROOF** - debrief Past, Results, Outlook, Obstacles,
   Feelings with the lead within 24h.
6. **Aggregate on the dashboard** - roll sessions up weekly (throughput,
   avg T%, charter progress) to drive strategy, not a bugs-per-session
   KPI.

## The unit: a session

Per Jonathan and James Bach's SBTM paper (satisfice.com):

> "A session is an uninterrupted block of reviewable, chartered
> test effort... A session may be short (around 60 minutes) or
> long (up to about 2 hours). Two hours is generally considered
> the upper limit because tester focus degrades."

Properties of a session:

- **Time-boxed:** 60-90 minutes typical; absolute upper bound ~2
  hours
- **Chartered:** has a stated mission (what to explore, what to
  learn)
- **Uninterrupted:** no context-switching to other work mid-session
- **Reviewable:** produces a session sheet that the lead can
  review

## The charter

A charter states the **mission** for one session. Per Bach:

```
Explore <area>
With <tools / resources>
To discover <information>
```

Examples:

| Charter |
|---|
| "Explore the cart promo-stacking flow with manual sample inputs to discover discount-application bugs." |
| "Explore the password-reset endpoint with the OWASP Top 10 list to discover injection / SSRF vulnerabilities." |
| "Explore the checkout error states with a flaky-network proxy to discover retry behaviour issues." |
| "Explore the admin dashboard's role-permission UI with three test users to discover authorization-leak bugs." |

Charters are not test cases. They state *what to investigate* and
leave the *how* to the tester's judgment in the session.

A backlog of charters drives multi-session campaigns. The lead
prioritises charters per the test strategy (`test-strategy-author`)
and the risk register (`risk-matrix`).

## The session sheet and metrics

Each session produces a session sheet whose sections are: Charter,
Areas, session timings, TBS metrics, Data files, Test notes, Bugs,
Issues (meta process problems), and the PROOF debrief. The TBS
time-breakdown splits each session into **T** (test design +
execution), **B** (bug investigation + reporting), and **S** (setup /
overhead), plus Opportunity and Idle. Healthy ranges: T 60-80%, B
10-20%, S 10-15%; T under 50% signals trouble.

Full sheet template, the TBS definitions, and the cross-session
dashboard metrics:
[references/session-sheet-and-metrics.md](references/session-sheet-and-metrics.md).

## PROOF debrief

Per
`manual-test-debrief` - the
post-session debrief structure:

| Letter | Stands for |
|---|---|
| **P** | Past: what happened in this session |
| **R** | Results: what was found |
| **O** | Outlook: what's left to test; suggested follow-up charters |
| **O** | Obstacles: what blocked the tester |
| **F** | Feelings: tester's qualitative read on quality |

The lead reviews PROOFs with the tester briefly (5-10 min) before
the session sheet is filed.

## Worked example - one 90-minute session

```markdown
**Charter:** Explore the cart promo-stacking flow with manual sample
inputs to discover discount-application bugs.

**Timings:** Started 14:00; 90 min; 10 min setup; 70 min charter;
10 min bug investigation.

**Bugs:** B-001 - "STACK50" applies after tax instead of before,
reproduces 3/3.

**Issues:** Cannot reach step 4 without a paid account; blocks ~40%
of charter scope.

**TBS:** T 70% / B 11% / S 11% / Idle 8% - healthy.

**PROOF Outlook:** recommend a follow-up charter for tax-jurisdiction
promos.
```

Result: the session sheet is filed and reviewed within 24h; the lead
schedules the follow-up charter and provisions a paid test account to
unblock the Issue.

## Common confusions

| Confusion | Reality |
|---|---|
| "SBTM = ad-hoc testing." | SBTM is *structured*: chartered, time-boxed, reviewed. Ad-hoc has none of those. |
| "Session sheet = test report." | Session sheet captures the *journey*; test report aggregates outcomes. |
| "Charters = test cases." | Charters state the *mission*; test cases prescribe steps. |
| "More TBS time = better tester." | Wrong: T% is environment + charter health, not tester skill. |
| "Sessions need to find bugs to be valuable." | Wrong: confirming coverage in a known-clean area is also valuable. |
| "Exploratory testing = unscripted." | Distinct concepts: SBTM is *management*; unscripted execution is *technique*. SBTM sessions can be more or less scripted. |

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Sessions > 2 hours | Focus collapses; quality drops | Hard 2-hour cap |
| Multi-charter sessions | Loses focus; metrics ambiguous | One charter per session |
| Sessions tracked in a spreadsheet that no one reviews | Effort wasted; learning lost | Lead reviews each session within 24h |
| Charter as "test X" | Doesn't direct exploration | Use `Explore X with Y to discover Z` |
| TBS metrics never used | Throwaway data | Aggregate weekly; drive process change |
| Bug-finding rate as KPI | Incentivises shallow bug-hunting | Charter throughput + dashboard health, not bugs-per-session |
| Session sheets without PROOF | Lose tester's qualitative signal | Always close with PROOF debrief |

## Limitations

- **Requires tester skill.** SBTM is a framework; it doesn't make
  bad testers good. The framework's value rises with tester
  expertise.
- **Cadence overhead.** Sessions + sheets + reviews add coordination
  cost. Worth it for medium-+ teams; overhead for solo testers.
- **Charter authoring is hard.** Vague charters produce vague
  sessions. Investment in charter discipline pays off.
- **Dashboard interpretation requires context.** Raw metrics
  (sessions/week, bugs/session) can mislead without
  charter-framing context.
- **Doesn't replace automated coverage.** SBTM is for
  exploration, not regression - pair with automated suites.

## References

- Bach J., Bach J. *Session-Based Test Management* (2000) - 
  [satisfice.com/download/session-based-test-management](https://www.satisfice.com/download/session-based-test-management).
- Bach J. *Exploratory Testing Explained* - 
  [satisfice.com/exploratory-testing](https://www.satisfice.com/exploratory-testing).
- Bolton M. *Exploratory testing series* - 
  [developsense.com](https://developsense.com/).
- Hendrickson E. *Explore It!* (Pragmatic Bookshelf, 2013) - book.
- Full session-sheet template + TBS + dashboard metrics:
  [references/session-sheet-and-metrics.md](references/session-sheet-and-metrics.md).
- Sibling references (heuristic catalogues the session applies):
  `hiccupps-f-heuristic`,
  `sfdpot-exploratory-heuristic`,
  `fcc-cuts-vids-heuristic`,
  `crusspic-stmpl-heuristic`,
  `exploratory-tours-reference`.
- Consumed by: `manual-test-debrief`.
