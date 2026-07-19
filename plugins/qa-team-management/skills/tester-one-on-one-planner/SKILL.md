---
name: tester-one-on-one-planner
description: "Build-an-X workflow that produces recurring 1:1 agenda structures for a QA manager and each tester - a cadence plan, a per-meeting agenda with an explicit status-versus-growth time split, and a coaching-question bank built on the GROW model (Goal, Reality, Options, Will) with QA-specific prompts seeded from the tester's skill-matrix row. Grounded in the 1:1 meeting styles cataloged in Camille Fournier's The Manager's Path (ISBN 978-1491973899). Distinct from `performance-feedback-author` (sibling skill producing a written evidence-based feedback artifact; this skill plans the recurring conversation where feedback lands), from `career-ladder-author` (the level structure growth conversations point at), and from an adversarial Definition-of-Done reviewer of work products (which coaches work products, not people-conversation planning). Use when a QA manager sets up 1:1s with a new team, or when existing 1:1s have degraded into status meetings."
metadata:
  keywords: "one-on-one, 1-1, coaching, grow-model, agenda, people-management"
---

# tester-one-on-one-planner

## Overview

The default failure mode of a 1:1 is that it becomes a status meeting: the manager already has CI dashboards, sprint boards, and the weekly digest, so spending the one recurring private slot per tester re-reading them wastes the only meeting whose purpose is the person. *The Manager's Path* (Camille Fournier, O'Reilly 2017, ISBN 978-1491973899) catalogs the recurring 1:1 styles managers fall into - the to-do list meeting, the catch-up, the feedback meeting, the progress report - and treats the pure progress report as the degenerate case to design away from. This skill produces the design: cadence, agenda with a protected growth segment, and a coaching-question bank.

For the growth segment, the question structure is the **GROW model**: **G**oal, **R**eality, **O**ptions, **W**ill (also "Way Forward"), developed by Sir John Whitmore and colleagues in the late 1980s and popularized by his book *Coaching for Performance* ([Performance Consultants, the firm Whitmore co-founded](https://www.performanceconsultants.com/grow-model), fetched 2026-06-10). The same source carries Whitmore's caution that "any dictator can use GROW" - the sequence only works as coaching when the tester, not the manager, supplies the answers.

## When to use

- A QA manager takes over a team (new hire, reorg, first management role) and needs a 1:1 system before the first week of meetings.
- Existing 1:1s audit as status meetings: reviewing the last month of notes shows ticket talk and no growth topics.
- A specific tester is stalled (same skill-matrix row two cycles in a row) and the manager wants a coaching structure rather than an ad-hoc pep talk.

Do **not** use this skill to:

- Write performance feedback or review input - that is [`performance-feedback-author`](../performance-feedback-author/SKILL.md); this skill reserves the slot where that feedback is delivered.
- Review a story or PR against the Definition of Done - that is an adversarial Definition-of-Done reviewer's job; it coaches work products, not people.
- Replace skip-levels, retros, or team meetings; the 1:1 is one instrument with one scope: this manager, this tester.

## Step 1 - Capture the inputs

| Input | Notes |
|---|---|
| **Roster with context** | Per tester: role, seniority, tenure, remote/colocated, current skill-matrix row if [`skill-matrix-author`](../skill-matrix-author/SKILL.md) has run |
| **Manager's span** | Number of reports bounds the cadence (weekly at <=6 reports; biweekly above that with a written async status channel replacing the lost slot) |
| **Existing 1:1 notes** | If any; one month of notes is enough to diagnose the status-meeting failure mode |
| **Active growth threads** | Promotion candidates, performance concerns, ladder goals per tester |

## Step 2 - Set the cadence and the standing structure

Defaults to adjust, not rules: 30 minutes weekly per tester; same slot every week; a shared running document per pair, visible to both, where either side adds agenda items between meetings. The shared doc is what stops the meeting from resetting to "so, what's up?" every week.

Split the 30 minutes explicitly:

| Segment | Budget | Content |
|---|---|---|
| **Their agenda** | 10 min | Whatever the tester brought; they go first, always |
| **Status, bounded** | 5 min | Only blockers needing the manager; everything else lives in the async channel |
| **Growth (protected)** | 10 min | One running growth thread per tester, advanced with GROW questions (Step 3) |
| **Feedback + actions** | 5 min | One piece of specific feedback each way; confirm written actions |

The protected growth segment is the load-bearing rule: status may not overflow into it. If a real incident eats a meeting, the next meeting starts with growth, not status.

## Step 3 - Build the GROW question bank, QA-flavored

Per the [GROW model](https://www.performanceconsultants.com/grow-model): **Goals** (define what you want to achieve), **Reality** (understand the current situation), **Options** (explore possible choices), **Will/Way Forward** (decide what actions you will take). The bank below instantiates each stage for common QA growth threads; the manager asks, the tester answers, and the manager resists supplying options before the tester has produced their own.

```markdown
## GROW bank - thread: "exploratory tester wants automation skills"

**Goal**
- Where do you want to be with automation by the end of the quarter - what would
  you be able to do then that you cannot do now?
- Which ladder axis does this serve? (tie to the QA-IC level criteria)

**Reality**
- What is your current footing - what have you written, even small? (cross-check:
  skill-matrix row says Playwright = 1 aware)
- What has stopped you so far - time, review fear, no starter task?

**Options**
- What routes can you see? (wait for theirs first; then add: pairing with the
  harness owner, taking one quarantined flaky test as a fix-it project,
  a starter PR with a named reviewer)
- Which option gets you a merged PR soonest?

**Will / Way Forward**
- What will you do before our next 1:1? How will I see it (PR link)?
- What do you need from me - a named reviewer, two protected hours weekly?
```

Maintain one such thread per tester; a thread survives multiple meetings until its Goal is met or consciously dropped.

## Step 4 - Emit the per-tester plan

One page per tester:

```markdown
# 1:1 plan - Chen (exploratory specialist, IC2, 18 months on team)

- Cadence: Tuesdays 14:00, 30 min. Shared doc: <link>.
- Split: 10 theirs / 5 status / 10 growth / 5 feedback.
- Growth thread: automation skills (GROW bank above). Started 2026-06-03.
  Skill-matrix baseline: Playwright 1. Target: 2 by 2026-09 (evidence: merged PRs).
- Feedback queue: positive - charter sessions found 2 of 3 Q1 P1 escapes
  (deliver via SBI, see performance-feedback-author); corrective - none queued.
- Watch: promotion-evidence list for QA-IC3 says review-comments-that-teach;
  none yet. Candidate next thread.
```

## Step 5 - Schedule the periodic style rotation

A weekly structure goes stale. Borrowing the style catalog from *The Manager's Path* (ISBN 978-1491973899), rotate deliberately instead of drifting: quarterly, replace one regular slot with a career-focused meeting (ladder progress against [`career-ladder-author`](../career-ladder-author/SKILL.md) criteria); after a hire's first month, run a getting-to-know-you style meeting; before review season, run a feedback-heavy meeting that previews the written review so nothing in it is a surprise. The progress-report style stays banned except where a tester runs an independent project the manager genuinely has no other window into.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| 1:1 as status meeting | Burns the only person-focused slot on data the manager already has | Step 2 bounds status to 5 min; async channel absorbs the rest |
| Cancelling when busy | Reads as "you are my lowest priority"; threads die between gaps | Reschedule within the week; cancellation needs the same bar as cancelling a customer meeting |
| Manager-supplied solutions in the growth segment | Whitmore's caution applies: GROW run as advice delivery is direction, not coaching ([performanceconsultants.com](https://www.performanceconsultants.com/grow-model)) | Tester speaks first at Options; manager adds options only after |
| No written actions | Will-stage commitments evaporate; the next meeting re-litigates | Actions in the shared doc with owner and check date |
| Same agenda for every tester | A junior's growth thread and a staff IC's differ in kind | Per-tester plan (Step 4) seeded from their matrix row and ladder target |
| Saving feedback for review season | Surprises in reviews signal the 1:1s failed | One specific piece of feedback per meeting (Step 2 split) |

## Limitations

- **Cadence math breaks above ~8 reports.** Weekly 30-minute 1:1s for 10+ reports cost a day per week; the skill emits a biweekly fallback but the real fix is org design, out of scope here.
- **GROW is not therapy.** Personal crises, conflict, and HR matters exit the coaching frame; route to the appropriate channel rather than coaching through them.
- **Remote pairs need more deliberate structure.** The shared doc and protected split matter more when there is no hallway; the skill's defaults assume that discipline rather than enforcing it.
- **Book guidance cited by ISBN.** The 1:1 style catalog comes from *The Manager's Path* (ISBN 978-1491973899); read its "Managing People" chapter for the full treatment.

## Hand-off targets

- **Written, evidence-based feedback to deliver in the slot** → [`performance-feedback-author`](../performance-feedback-author/SKILL.md).
- **Ladder criteria for career-focused meetings** → [`career-ladder-author`](../career-ladder-author/SKILL.md).
- **Skill-matrix row that seeds each growth thread** → [`skill-matrix-author`](../skill-matrix-author/SKILL.md).

## References

- GROW model - Goal / Reality / Options / Will, Sir John Whitmore and colleagues, late 1980s; *Coaching for Performance*; "any dictator can use GROW" caution: https://www.performanceconsultants.com/grow-model (fetched 2026-06-10).
- Camille Fournier, *The Manager's Path*, O'Reilly 2017, ISBN 978-1491973899 - 1:1 meeting styles (to-do list, catch-up, feedback, progress report, getting-to-know-you) and continuous-feedback culture, "Managing People" chapter.
- [`performance-feedback-author`](../performance-feedback-author/SKILL.md), [`career-ladder-author`](../career-ladder-author/SKILL.md), [`skill-matrix-author`](../skill-matrix-author/SKILL.md) - sibling skills this planner composes with.
