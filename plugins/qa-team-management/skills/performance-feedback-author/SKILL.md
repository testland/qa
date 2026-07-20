---
name: performance-feedback-author
description: "Build-an-X workflow that drafts evidence-based performance feedback and review input for testers using the Center for Creative Leadership's SBI model (Situation - Behavior - Impact, extended to SBII with Intent) - pulling every Behavior statement from verifiable work artifacts (bug reports authored, test cases and automation merged, review comments, charter session logs) rather than impressions or adjectives. Produces the written feedback artifact itself - not the agenda for the recurring conversation where it is delivered, not a team capability map (kept deliberately separate from performance data), and not a scorecard for external candidates. Use when a QA manager owes someone specific feedback this week, or when writing review input or a promotion case for review season."
metadata:
  keywords: "performance-feedback, sbi, performance-review, evidence-based, promotion-case, feedback"
---

# performance-feedback-author

## Overview

Most performance feedback fails on the same axis: it describes the manager's impression ("not detail-oriented enough", "great team player") instead of the person's behavior, so the recipient can neither verify it nor act on it. The Center for Creative Leadership's **SBI model** fixes the shape: clarify the **Situation** with a precise time and place rather than a vague window ("this morning at the 11 am team meeting", not "last week"); describe the specific observable **Behaviors** without judgment (someone "interrupted me while I was telling the team about the monthly budget", not someone "was rude"); explain the **Impact** the behavior had, including the genuine effect on you ("impressed", "frustrated", "troubled"). CCL extends it to **SBII** by adding an **Intent** inquiry - asking "What were you hoping to accomplish with that?" - which turns delivery into a two-way conversation and replaces negative assumptions about motive. CCL's claim for the format is practical: it "reduces anxiety around giving feedback" and decreases defensiveness in recipients. (All of the above: [CCL, "Use Situation-Behavior-Impact (SBI) To Understand Intent"](https://www.ccl.org/articles/leading-effectively-articles/closing-the-gap-between-intent-vs-impact-sbii/), fetched 2026-06-10.)

This skill adds the QA-specific half: in a testing team, the Behavior component should come from **work artifacts**, which are abundant and citable - bug reports, test cases, automation PRs, review comments, charter logs, CI history. Feedback built on artifacts survives challenge; feedback built on recollection does not.

## When to use

- A tester did something this week that deserves specific feedback, positive or corrective, and the manager wants it in deliverable shape before the next 1:1.
- Review season: the manager owes written review input per tester and wants it evidence-based rather than adjective-based.
- A promotion case needs assembling against the ladder's evidence list.
- Peer-feedback requests arrive and the team needs a format that keeps them concrete.

Do **not** use this skill to:

- Plan the meeting where feedback is delivered - that is [`tester-one-on-one-planner`](../tester-one-on-one-planner/SKILL.md).
- Update the team capability map - that is [`skill-matrix-author`](../skill-matrix-author/SKILL.md); mixing performance judgments into the matrix corrupts it as a planning tool.
- Run disciplinary or termination processes - those are HR-owned and carry legal constraints beyond the scope of this skill.

## Step 1 - Capture the inputs

| Input | Notes |
|---|---|
| **Subject + window** | Tester, and the period the feedback covers (a single event, a sprint, a review half-year) |
| **Artifact access** | Bug tracker (reports authored, triage quality), test management tool or repo (test cases, charters), code review system (comments given and received), CI history |
| **Purpose** | One of: immediate feedback / review input / promotion case - the same evidence, three different output shapes (Step 4) |
| **Ladder criteria** | For review input and promotion cases: the level's evidence list from [`career-ladder-author`](../career-ladder-author/SKILL.md) |

## Step 2 - Mine the artifacts for Behavior candidates

For each feedback theme, locate the artifact before writing a word. QA work leaves a wide evidence trail:

| Artifact class | What it evidences | Where |
|---|---|---|
| Bug reports authored | Investigation depth, reproduction quality, severity judgment | Tracker query: reporter = subject, window |
| Test cases / charters | Coverage thinking, technique application, edge-case instinct | Test management tool, charter log |
| Automation PRs | Code quality, flake-rate of authored tests, harness contributions | Repo history, CI pass-rate per test author |
| Review comments given | Teaching behavior, rigor, tone | Review system: comments by subject |
| Escapes in owned area | Outcome trend (use with care: escapes have many causes) | Defect tracker, found-in = production |
| Triage and incident threads | Communication under pressure, hand-off quality | Tracker and incident tool history |

Rule: **no Behavior statement without a linkable artifact or a first-person observation with date and place.** Secondhand reports ("people say...") are not Behavior; either observe directly, collect the reporter's own SBI, or drop the theme.

## Step 3 - Draft each item as SBI(I)

Worked example, corrective, artifact-backed:

```markdown
**Situation:** In Tuesday's triage meeting (2026-06-02), reviewing bug #4821,
the payment-retry failure you filed on Friday.

**Behavior:** The report had a one-line description, no reproduction steps, and
no environment block. Dev returned it as cannot-reproduce, and you re-filed it
with full steps on Monday (#4838) - those steps reproduced first try.

**Impact:** We lost two working days on a P2 in the payment path, and the
developer's first hour went into guessing context your Monday version supplied
in full. When your reports carry reproduction steps, like #4838 or #4640 from
May, they typically clear triage in one pass. I want that to be the default.

**Intent (ask, then listen):** What was happening on Friday when you filed the
first version - what were you trying to get done?
```

Worked example, positive, same discipline:

```markdown
**Situation:** During the 2026-Q1 charter sessions on checkout (your session
log, weeks 3 - 14).

**Behavior:** You logged 31 charter-based sessions and your session notes
flagged the cart-merge timing issue that became P1 #4512 before it shipped,
including a recorded repro.

**Impact:** Two of the quarter's three would-be P1 escapes were caught in your
sessions; the cart-merge catch alone avoided a production incident in the
revenue path. I used your session notes as the example in the team's charter
workshop - I was genuinely impressed by the audit trail.
```

The positive example follows the identical Situation/Behavior/Impact discipline ([CCL](https://www.ccl.org/articles/leading-effectively-articles/closing-the-gap-between-intent-vs-impact-sbii/)); vague praise ("great quarter!") wastes signal exactly the way vague criticism does. The Intent step is most valuable on corrective items: per CCL it surfaces the gap between what the person intended and the impact that landed, instead of assuming motive.

## Step 4 - Assemble into the purpose-shaped output

- **Immediate feedback:** one SBI(I) item, delivered in the next 1:1's feedback segment (the [`tester-one-on-one-planner`](../tester-one-on-one-planner/SKILL.md) agenda reserves 5 minutes). Feedback delivered within a week of the event beats a stockpile at review time; *The Manager's Path* (Camille Fournier, O'Reilly 2017, ISBN 978-1491973899) frames this as building a culture of continuous feedback, with the written review as a summary of conversations already had, never a surprise.
- **Review input:** 4 - 8 SBI items spanning the window, grouped by the ladder axes, each citing its artifact, plus a one-paragraph synthesis. Strengths and growth areas both artifact-backed.
- **Promotion case:** the level's observable-evidence list from [`career-ladder-author`](../career-ladder-author/SKILL.md), with one artifact-cited SBI item per evidence line, and explicit gaps marked `[NO EVIDENCE YET]` rather than papered over.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Adjective feedback ("be more proactive") | Unverifiable and unactionable; recipient cannot replay what to change | Every item passes the Step 2 artifact rule |
| Personality framing ("you are careless") | Attacks identity, spikes defensiveness; CCL's model exists to avoid exactly this | Behavior describes actions ("the report lacked repro steps"), never traits |
| Vague situations ("recently", "sometimes") | Recipient cannot place the event; the conversation degrades into whether it happened | CCL: name the time and place precisely |
| Assumed motives ("you clearly did not care") | Usually wrong, always inflammatory | SBII Intent question: ask what they were trying to accomplish ([CCL](https://www.ccl.org/articles/leading-effectively-articles/closing-the-gap-between-intent-vs-impact-sbii/)) |
| Feedback sandwich | Buries the signal; recipients learn to discard the praise as packaging | One item, one message; positive items stand alone on their own days |
| Stockpiling for review season | Months-old events are unfixable; the review becomes an ambush | Step 4 immediate path; reviews summarize known conversations (ISBN 978-1491973899) |
| Metric-only judgment (bug counts as performance) | Raw counts reward volume over value and are gameable | Counts may locate themes; the feedback itself cites specific artifacts and their impact |

## Limitations

- **Artifacts do not cover everything.** Mentoring, meeting behavior, and cross-team communication often leave thin trails; those items rest on dated first-person observation, clearly marked as such.
- **Outcome metrics are confounded.** Escape counts depend on area risk, not only on the tester; use outcome data to find themes, never as a verdict by itself.
- **Calibration is out of scope.** Cross-team rating fairness is a management-chain process; this skill makes one manager's input evidence-based, which is the precondition, not the whole.
- **Not an HR instrument.** Performance-improvement plans, disciplinary records, and termination documentation have legal requirements this skill does not address.

## Hand-off targets

- **Deliver it** → [`tester-one-on-one-planner`](../tester-one-on-one-planner/SKILL.md) (the feedback segment of the next 1:1).
- **Promotion case against level criteria** → [`career-ladder-author`](../career-ladder-author/SKILL.md).
- **Theme is a skill gap, not a performance issue** → [`skill-matrix-author`](../skill-matrix-author/SKILL.md) and a growth thread instead of corrective feedback.

## References

- Center for Creative Leadership, "Use Situation-Behavior-Impact (SBI) To Understand Intent" - the Situation / Behavior / Impact model, the Intent extension, precision guidance and the anxiety/defensiveness claims used throughout: https://www.ccl.org/articles/leading-effectively-articles/closing-the-gap-between-intent-vs-impact-sbii/ (fetched 2026-06-10).
- Camille Fournier, *The Manager's Path*, O'Reilly 2017, ISBN 978-1491973899 - continuous-feedback culture, writing and delivering performance reviews ("Managing People" chapter).
- [`tester-one-on-one-planner`](../tester-one-on-one-planner/SKILL.md), [`career-ladder-author`](../career-ladder-author/SKILL.md), [`skill-matrix-author`](../skill-matrix-author/SKILL.md) - sibling skills in the delivery, promotion, and capability paths.
