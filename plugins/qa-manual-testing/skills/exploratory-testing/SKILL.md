---
name: exploratory-testing
description: "Plans and runs time-boxed exploratory testing when tester hours are scarce before a release - one tester with two free 45-minute blocks before code freeze, a high-stakes window such as year-end payroll, or a device and environment the scripted suite never touches. Session-based per the Bachs' SBTM: charters (Explore X with Y to discover Z), 60-90 minute sessions, session sheets with TBS metrics, and the PROOF debrief. Bundles the exploration heuristics as references - Whittaker's seven tours, Kelly's FCC CUTS VIDS, Bach's SFDPOT. Broader than exploratory-charter-author, which writes one charter document: this owns the whole cycle from budgeting the available hours to debriefing what was found. Use when deciding what to explore with the time available, and how to run and record those sessions."
---

# exploratory-testing

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

Exploratory testing is not "clicking around". ISTQB defines it as testing
where "tests are simultaneously designed, executed, and evaluated while the
tester learns about the test object"
([ISTQB CTFL Syllabus v4.0.1 §4.4.2, p.44](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf)).
Human-driven testing has two modes, and this skill owns one of them:

|  | Scripted manual testing | Exploratory testing |
|---|---|---|
| Designed | Before execution, by someone else | During execution, by the person running it |
| Fixed in advance | Steps, data, expected result | A mission and a time box only |
| Output | Pass/fail per case, signed and dated | Session notes, bugs, issues, new charters |
| Finds | Deviations from what was anticipated | What nobody thought to anticipate |

For the scripted side (step-tables, Gherkin, UAT scripts, checklists), use
`manual-test-script-author`. This skill covers the exploratory side end to
end: charter, session, heuristics, debrief, review.

## When to use

- Onboarding a tester to SBTM vocabulary.
- Authoring a charter - what fields belong, what mission framing
  to use ([references/charter-template.md](references/charter-template.md)).
- Picking which tour, heuristic, or oracle to apply in a session
  (routing table below).
- Reviewing a session sheet for completeness
  ([references/session-review-checklist.md](references/session-review-checklist.md)).
- Building a session-tracking dashboard.

## How to use

1. **Write the charter** - "Explore <area> with <tools> to discover
   <information>". Keep it a mission, not a test-case list. Ready-to-fill
   card: [references/charter-template.md](references/charter-template.md).
2. **Time-box the session** - 60-90 min, one charter, uninterrupted;
   ~2-hour hard cap before focus degrades.
3. **Test and record** - explore per the charter (applying tours +
   heuristics from the routing table below) and log Areas, Bugs, and
   Issues in the session sheet as you go. Full template:
   [references/session-sheet-and-metrics.md](references/session-sheet-and-metrics.md).
4. **Track TBS** - note the Test / Bug / Setup split (plus Opportunity /
   Idle). Verify: T should land in the healthy 60-80% range before you
   trust the session; if T < 50%, stop and fix the cause (stabilise the
   environment or narrow the charter), then re-run the session before
   aggregating.
5. **Close with PROOF** - debrief Past, Results, Outlook, Obstacles,
   Feelings with the lead within 24h (full template + worked example:
   [references/debrief.md](references/debrief.md); lead-side review rules:
   [references/session-review-checklist.md](references/session-review-checklist.md)).
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

Example: "Explore the cart promo-stacking flow with manual sample inputs
to discover discount-application bugs." More charter examples are in
[references/session-sheet-and-metrics.md](references/session-sheet-and-metrics.md);
a full charter-card template (mission + areas + oracles + dimensions +
tours + deliverables) is in
[references/charter-template.md](references/charter-template.md).

Charters are not test cases. They state *what to investigate* and
leave the *how* to the tester's judgment in the session.

A backlog of charters drives multi-session campaigns. The lead
prioritises charters per the test strategy (`test-strategy-author`)
and the risk register (`risk-matrix`).

## Choosing a heuristic or tour

Each reference is a distinct lens; a strong session composes 2-3, never
all of them. Route by what the session needs:

| You need | Lens | Reference |
|---|---|---|
| A themed bug-hunting mission on a product you already know | Whittaker's seven tours (Feature, Money, Landmark, Intellectual, Bad-data, Configuration, Garbage collector's) | [references/tours.md](references/tours.md) |
| Recon on an unfamiliar product, before any charter exists | Kelly's FCC CUTS VIDS eleven touring questions | [references/fcc-cuts-vids.md](references/fcc-cuts-vids.md) |
| Ideas for what to **vary** when stuck mid-session | Bach's SFDPOT (Structure, Function, Data, Platform, Operations, Time) | [references/sfdpot.md](references/sfdpot.md) |
| To decide whether an observation **is a bug** | Bolton's HICCUPPS-F oracle catalog | [references/hiccupps-f.md](references/hiccupps-f.md) |
| Which **quality criteria** the session evaluates | Bach's CRUSSPIC STMPL thirteen criteria | [references/crusspic-stmpl.md](references/crusspic-stmpl.md) |
| A ready-to-fill charter card | Charter template + quality rules | [references/charter-template.md](references/charter-template.md) |
| To close and file the session | PROOF debrief template + aggregation | [references/debrief.md](references/debrief.md) |
| To review someone else's completed session sheet | Lead's review checklist + verdict rules | [references/session-review-checklist.md](references/session-review-checklist.md) |
| The session-sheet template, TBS metrics, dashboard | SBTM artifacts in full | [references/session-sheet-and-metrics.md](references/session-sheet-and-metrics.md) |

The catalogs complement each other: tours give the session a *theme*,
SFDPOT gives *variations*, HICCUPPS-F interprets *observations*, and
CRUSSPIC STMPL frames the *criteria*. Bach + Bolton's *Rapid Software
Testing* curriculum teaches them as one toolkit.

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

Every session closes with a **PROOF** debrief - the five-section report
from the original Bach & Bach SBTM paper:

| Letter | Stands for |
|---|---|
| **P** | Past: what happened in this session |
| **R** | Results: what was found |
| **O** | Outlook: what's left to test; suggested follow-up charters |
| **O** | Obstacles: what blocked the tester |
| **F** | Feelings: tester's qualitative read on quality |

The debrief flow: the tester fills the PROOF template **within 30 min of
session end** (memory fades fast); every Result links a bug ID or a
confirmed-working item; Outlook names the recommended next charter (the
chain to the next session); the lead reviews the debrief with the tester
briefly (5-10 min) within 24h before the session sheet is filed, using
the checklist in
[references/session-review-checklist.md](references/session-review-checklist.md).
**Feelings** is the load-bearing field teams skip - the tester's
qualitative judgment is signal no metric captures. Aggregated debriefs
drive the next round of charters: which areas are well-covered, which
are stale, which were never touched.

Full blank template, a fully worked debrief, the quarterly rollup table,
and the attention tracker: [references/debrief.md](references/debrief.md).

## Worked example

A full 90-minute session (charter, timings, bugs, issues, TBS, PROOF
outlook, and how the lead acts on it) is worked through in
[references/session-sheet-and-metrics.md](references/session-sheet-and-metrics.md).

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
| All heuristics in one session | Eleven shallow passes crowd out one useful one | Compose 2-3 lenses from the routing table |

## Limitations

- **Requires tester skill.** The framework's value rises with tester
  expertise; it doesn't make bad testers good.
- **Cadence overhead.** Sessions + sheets + reviews add coordination
  cost - worth it for medium-+ teams, overhead for solo testers.
- **Charter authoring is hard.** Vague charters produce vague sessions;
  charter discipline pays off.
- **Dashboard interpretation requires context.** Raw metrics
  (sessions/week, bugs/session) can mislead without charter framing.
- **Doesn't replace automated coverage.** SBTM is for exploration, not
  regression - pair with automated suites.

## References

- Bach J., Bach J. *Session-Based Test Management* (2000) - 
  [satisfice.com/download/session-based-test-management](https://www.satisfice.com/download/session-based-test-management).
- Bach J. *Exploratory Testing Explained* - 
  [satisfice.com/exploratory-testing](https://www.satisfice.com/exploratory-testing).
- Bolton M. *Exploratory testing series* - 
  [developsense.com](https://developsense.com/).
- Hendrickson E. *Explore It!* (Pragmatic Bookshelf, 2013) - book.
- ISTQB CTFL Syllabus v4.0.1 §4.4.2 (exploratory testing definition) -
  [istqb.org](https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf).
- Bundled references: [session-sheet-and-metrics.md](references/session-sheet-and-metrics.md),
  [tours.md](references/tours.md),
  [fcc-cuts-vids.md](references/fcc-cuts-vids.md),
  [sfdpot.md](references/sfdpot.md),
  [hiccupps-f.md](references/hiccupps-f.md),
  [crusspic-stmpl.md](references/crusspic-stmpl.md),
  [charter-template.md](references/charter-template.md),
  [debrief.md](references/debrief.md),
  [session-review-checklist.md](references/session-review-checklist.md).
- `manual-test-script-author` - the scripted-manual sibling (step-table,
  Gherkin, UAT, and checklist formats).
- `bug-bash-facilitator` - multi-cohort bug bash; inherits the PROOF
  debrief format.
