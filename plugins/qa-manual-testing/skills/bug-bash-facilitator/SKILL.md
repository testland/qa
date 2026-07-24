---
name: bug-bash-facilitator
description: "Builds a structured bug-bash session - pre-bash kit (charter, test-data prep, environment setup, sign-up sheet), in-bash structure (role rotation across cohorts, shared backlog board, real-time triage), scoring rubric (severity weighting, novelty bonus), and a post-bash same-day wrap-up authored by the facilitator (not a standalone debrief: for post-session writeups without a live bash, use manual-test-debrief). Use when a team needs a coordinated multi-tester sweep before a release or after a major change - converts an ad-hoc \"everyone test for an hour\" into a recorded, comparable session with deliverables."
---

# bug-bash-facilitator

## Overview

An unfacilitated bug bash is "everyone clicks around for an hour
and we hope something turns up." The result: lots of duplicates,
no triage, debrief skipped, no record.

A facilitated bug bash is **a structured exploratory session at
team scale** - multiple testers in coordinated cohorts, shared
backlog visible to all, triage in real-time, debrief that produces
follow-ups.

This skill builds the kit + structure + scoring + debrief.

## When to use

- Pre-release: a final before-prod sweep across the whole team.
- Post-major-change: after a refactor / migration / new platform
  integration.
- Quarterly: a scheduled "everyone tests for 90 min" cadence.
- New-tester onboarding: bug-bash as the team's first introduction
  for new joiners.

If the goal is a single tester running a charter, author a single
exploratory charter directly. Bug bashes are the multi-tester /
scaled version.

## Step 1 - Pre-bash kit (1 week before)

```markdown
# Bug bash - `<release / feature / area>`

**Date:** YYYY-MM-DD
**Time:** 14:00-15:30 (90 min)
**Environment:** staging.example.com (build `v1.4.5-rc1`)
**Facilitator:** _______________
**Note-taker:** _______________

## Mission

Find regressions, edge cases, and usability issues in the new
checkout flow before the release on YYYY-MM-DD.

## Charters (5 cohorts × 90 min)

Per cohort, 1-2 testers + 1 facilitator-roving:

- **Cohort A - Money:** Apply the Money tour
  across the new checkout discount + tax flow - visit every place
  money / pricing / currency / discount appears and verify each;
  hunts rounding errors, currency-conversion drift, discount
  stacking, free-shipping edges, locale formatting (€1.234,56 vs
  $1,234.56).
- **Cohort B - Bad data:** Apply the Bad-data tour
  across promo code input, address fields, payment fields - feed
  pathological inputs (empty, single space, 5000 chars, SQL
  injection, XSS, unicode bidi override, RTL text, emoji ZWJ
  sequences, null byte) and observe validation + error handling.
- **Cohort C - Configuration:** Vary user state (new vs existing
  account, EU vs US user, mobile vs desktop) and re-run hero flows.
- **Cohort D - Landmark:** Walk the canonical hero flow (search →
  add to cart → checkout → confirmation) under various conditions.
- **Cohort E - Garbage collector:** Visit every page in the
  checkout funnel; flag 404s, broken images, stale strings.

## Test data prep (do BEFORE the bash)

- [ ] Create 5 test accounts with varying states (per
      `synthetic-data-tool-selector`):
      `qa-bash-A`, `qa-bash-B`, ..., `qa-bash-E`.
- [ ] Seed promo codes: `WELCOME10`, `EXPIRED50`, `MIN100`,
      `STACKABLE5`.
- [ ] Pre-fund the Stripe test account; expose test cards
      (Stripe test card list).
- [ ] Verify staging is at the right SHA; tag artifact.

## Sign-up sheet

| Cohort | Tester(s)         | Notes |
|--------|-------------------|-------|
| A      |                   |       |
| B      |                   |       |
| ...    |                   |       |
```

The kit is sent **1 week before** so testers can prepare and
team members can RSVP. Testers who can't attend live get an
async-charter version.

## Step 2 - In-bash structure

```
14:00-14:05  Kickoff (facilitator presents the mission, charters, scoring rubric)
14:05-14:50  Round 1 (each cohort runs its charter; ~45 min)
14:50-15:00  Mid-bash huddle (5-min check-in: what's everyone seeing?)
15:00-15:25  Round 2 (cohorts swap charters; new lens on the same area)
15:25-15:30  Wrap (everyone logs final bugs; facilitator closes the board)
```

The cohort swap at the midpoint is critical - it's the same
testers looking at the area through a fresh lens, and it surfaces
bugs that the first cohort's tour missed.

## Step 3 - Shared backlog board

A shared spreadsheet / Notion table / GitHub issues view that
everyone can see live during the bash:

| ID  | Time  | Cohort | Reporter | Title                           | Severity | Repro                        | Triage | Owner | Final disposition |
|-----|-------|--------|----------|---------------------------------|----------|------------------------------|--------|-------|-------------------|
| 1   | 14:08 | A      | Alice    | Promo `WELCOME10` not applied    | high     | Cart `BOOK-001`; apply code   | bug    | Bob   | BUG-987 |
| 2   | 14:12 | B      | Bob      | Promo input accepts SQL injection | high     | Type `'; DROP--` and apply   | bug    | Bob   | BUG-988 |
| 3   | 14:15 | A      | Alice    | Subtotal off by 1 cent on $24.99 + 10% | low | Apply WELCOME10 to $24.99    | bug    | Carol | BUG-989 |
| 4   | 14:20 | C      | Carol    | EU user sees $ symbol instead of € | medium | Set locale=EU; checkout      | bug    | Dave  | BUG-990 |

The **Triage** column is filled in real-time by a roving
facilitator who decides:

- `bug`: confirmed reproducible defect.
- `dup`: duplicate of another row.
- `spike`: needs a research session (architectural concern, not a
  fixable defect).
- `quirk`: known trade-off or won't-fix; document and close.
- `tbd`: needs more investigation.

Real-time triage prevents the debrief from being a giant
classification exercise.

## Step 4 - Scoring rubric

Optional but motivating: a points system.

| Finding type           | Points |
|------------------------|-------:|
| **Critical** (data loss, P0) | 10 |
| **High** (broken flow)        |  5 |
| **Medium** (degraded UX)      |  3 |
| **Low** (cosmetic / minor)    |  1 |
| **Novel** (no one else thought to check) | +2 bonus |
| **Cluster lead** (the first row in a 3+-row cluster) | +1 bonus |
| **Duplicate** (already on board) | 0 |

Tally per cohort + per individual at the wrap. The points are
explicitly **fun**, not performance review - but they motivate
testers to go beyond the obvious.

## Step 5 - Post-bash debrief

Within 24 hours, the facilitator + note-taker produce:

```markdown
## Bug bash debrief - `<release>`

**Date:** YYYY-MM-DD
**Participants:** N (across 5 cohorts)
**Duration:** 90 min

### Findings summary

| Severity   | Count | Notes |
|------------|------:|-------|
| Critical   |     0 |       |
| High       |     6 | 4 cluster (promo flow); 2 isolated (config) |
| Medium     |    14 |       |
| Low        |    23 | mostly cosmetic / copy issues |
| **Total**  |    43 |       |

### Cluster analysis

| Cluster                | Bugs | Bug IDs                | Owner    | Action |
|------------------------|-----:|------------------------|----------|--------|
| Promo apply edge cases  |    7 | BUG-987, 988, 989, 990, 991, 992, 993 | Bob | Block release until fixed. |
| EU locale bugs           |    3 | BUG-994, 995, 996       | Dave | Fix in current sprint. |
| Cosmetic / copy          |   12 | (per-bug)               | Eve  | Backlog; address over the next 2 sprints. |

### Cohort scoring (per Step 4)

| Cohort | Findings | Points | Top finder |
|--------|---------:|-------:|------------|
| A      |       12 |     34 | Alice (BUG-987 high + 2 cluster lead bonuses) |
| B      |        9 |     27 | Bob (SQL injection - high + novelty) |
| ...    |          |        |            |

### Process retrospective

What went well: ...
What didn't: ...
What to change for next bash: ...

### Action items

- [ ] Bob: fix BUG-987 cluster within 48h (release blocker).
- [ ] Dave: fix EU locale cluster in current sprint.
- [ ] Eve: backlog the 12 cosmetic items for grooming.
- [ ] Facilitator: schedule next bash for `v1.5.0` release.
```

## Step 6 - Async participants

Team members who can't attend live get a **mini-charter** to run
solo within the same week:

```markdown
# Async bug bash mini-charter - `<release>` (cohort: pick one)

You missed the live bash; here's the 30-min version. Pick a
cohort that wasn't done yet (or revisit one with a new lens).

(charter cohort body)

When done, log findings to the same shared board with
`async` tag.
```

Async participation isn't ideal (no roving facilitator, no live
triage) but it broadens coverage.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Open-ended "everyone test for an hour"                                | Heavy duplication; no coverage map; debrief skipped.                     | Cohorts + charters (Step 1). |
| No real-time triage                                                    | Debrief becomes a 3-hour classification exercise.                        | Roving facilitator triages live (Step 3). |
| Scoring as performance review                                          | Testers chase points, miss high-value bugs.                              | Scoring is for fun + motivation; explicit "not performance" disclaimer. |
| Bug bash without test-data prep                                        | Testers spend half the time creating accounts.                           | Pre-prep test data 1 week ahead (Step 1). |
| Same-cohort assignments quarter after quarter                           | Same testers find the same bugs.                                         | Rotate assignments; mid-bash cohort swap (Step 2). |
| Post-bash with no follow-up actions                                    | Bugs sit in the backlog; team disillusioned by next bash.                | Action items per cluster owner (Step 5). |
| Running the bash on a stale build                                       | Bugs found are already-fixed; testers waste time.                        | Tag the build SHA; verify staging is current. |

## Limitations

- **High coordination cost.** A bug bash is 90 min of testing × N
  testers + 1-2 hours facilitator prep + 30 min debrief authoring.
  Don't run weekly; ~quarterly is the right cadence for most teams.
- **Findings depend on coverage.** Cohorts cover what's assigned;
  gaps invisible. Pair with automated regression for known
  shapes.
- **Doesn't replace per-feature exploratory.** A bash hits
  breadth; per-feature exploratory hits depth. Both have a place.
- **Async less effective than live.** Without live triage and the
  cohort swap, async finds fewer bugs per hour.

## References

- `exploratory-tours-reference` - the heuristics menu the cohorts pick from.
- `manual-test-debrief` - the
  PROOF debrief format the bug-bash debrief inherits from.
- `synthetic-data-tool-selector` - used in the test-data-prep step.
