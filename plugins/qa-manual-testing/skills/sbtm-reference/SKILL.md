---
name: sbtm-reference
description: "Pure-reference catalog of Session-Based Test Management (SBTM) - Jonathan and James Bach's framework for managing exploratory testing as time-boxed sessions. Defines the session (60-90 min focused exploration), the charter (mission statement), the session sheet structure (TBS / OPP / setup / test design + execution / charter / bug / issues / sessions), the dashboard view (% session time, bug-finding rate, charter throughput), and the PROOF debrief. Use as the canonical SBTM vocabulary that exploratory-charter-author + manual-test-debrief consume."
---

# sbtm-reference

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
[`exploratory-charter-author`](../../../qa-roles/agents/exploratory-charter-author.md),
[`manual-test-debrief`](../manual-test-debrief/SKILL.md), and the
tour-catalogues
([`exploratory-tours-reference`](../exploratory-tours-reference/SKILL.md)).

For the canonical heuristic catalogs the tester applies during a
session, see
[`hiccupps-f-heuristic`](../hiccupps-f-heuristic/SKILL.md),
[`sfdpot-heuristic`](../sfdpot-heuristic/SKILL.md),
[`fcc-cuts-vids-heuristic`](../fcc-cuts-vids-heuristic/SKILL.md),
[`crusspic-stmpl-heuristic`](../crusspic-stmpl-heuristic/SKILL.md).

## When to use

- Onboarding a tester to SBTM vocabulary.
- Authoring a charter - what fields belong, what mission framing
  to use.
- Reviewing a session sheet for completeness.
- Building a session-tracking dashboard.

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
prioritises charters per the test strategy
([`test-strategy-author`](../../../qa-process/skills/test-strategy-author/SKILL.md))
and the risk register
([`risk-matrix`](../../../qa-process/skills/risk-matrix/SKILL.md)).

## The session sheet

Each session produces a session sheet. Bach's canonical structure
(satisfice.com):

```markdown
# Session sheet - YYYY-MM-DD - <tester>

## Charter

Explore <area> with <tools> to discover <information>.

## Areas

- (system area 1)
- (system area 2)
- ...

## Session start / duration / setup time / focus

- Started: 14:00
- Duration: 90 min
- Setup time: 10 min
- Charter time: 70 min
- Bug-investigation time: 10 min
- Opportunity time: 0 min

## TBS metrics (time-breakdown)

- Test design + execution: 70%
- Bug investigation + reporting: 11%
- Setup / overhead: 11%
- Opportunity: 0%
- Idle / interruption: 8%

## Data files

- screenshots/2026-05-20-14-15.png
- har/2026-05-20-14-22.har

## Test notes

(narrative of what was tested, in tester's own words; includes
tours applied, heuristics applied, hypotheses formed)

## Bugs (file later)

- B-001: Promo "STACK50" applies after tax instead of before;
  reproduces 3/3. Captured at 14:35.
- B-002: Empty cart + apply promo → page error, not graceful message.

## Issues (meta - testing-process problems)

- Cannot get to step 4 in flow without a paid customer account;
  test data unavailable. Blocking 40% of charter scope.

## PROOF debrief

(See manual-test-debrief)
```

## TBS metrics - time breakdown

Per Bach's SBTM paper, sessions decompose into:

| Category | Definition |
|---|---|
| **T** (Test) | Time spent on test design + execution per the charter |
| **B** (Bug) | Time spent investigating + reporting bugs |
| **S** (Setup) | Time setting up the environment / test data / tools |

Plus often-included:

- **Opportunity:** unrelated bugs found by chance; investigated outside charter scope
- **Idle:** waiting on a build / response

Healthy session: T 60-80%, B 10-20%, S 10-15%. Skewed sessions
(T < 50%) signal problems - environment instability, charter too
broad, etc.

## Dashboard metrics - across sessions

Per Bach's SBTM Reporting paper (satisfice.com), the lead views:

| Metric | What it tells |
|---|---|
| **Sessions per week** | Throughput |
| **Avg T% across sessions** | Environment / charter-scope health |
| **Bugs per session** | Find rate (interpret carefully - not all sessions should find bugs) |
| **Charters complete / in-progress / blocked** | Coverage progress |
| **Charter-to-bug ratio** | Quality of charter framing (too broad = many small bugs; too narrow = few) |

These feed the testing-strategy review at sprint planning.

## PROOF debrief

Per
[`manual-test-debrief`](../manual-test-debrief/SKILL.md) - the
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
- Sibling references (heuristic catalogues the session applies):
  [`hiccupps-f-heuristic`](../hiccupps-f-heuristic/SKILL.md),
  [`sfdpot-heuristic`](../sfdpot-heuristic/SKILL.md),
  [`fcc-cuts-vids-heuristic`](../fcc-cuts-vids-heuristic/SKILL.md),
  [`crusspic-stmpl-heuristic`](../crusspic-stmpl-heuristic/SKILL.md),
  [`exploratory-tours-reference`](../exploratory-tours-reference/SKILL.md).
- Consumed by:
  [`exploratory-charter-author`](../../../qa-roles/agents/exploratory-charter-author.md),
  [`manual-test-debrief`](../manual-test-debrief/SKILL.md).
