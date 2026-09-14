# Three tickets at the top of the backlog and I can only take two into the sprint

## Problem Description

Sprint planning is Monday at 10. Three tickets are sitting at the top of the
backlog and the squad has room for about two of them. I do not need you to
estimate them and I do not need you to decide which two are more valuable —
that is my call and I have already made it on business grounds.

What I need is the other filter. A ticket only goes into a sprint here if the
engineer who picks it up and the tester who signs it off will reach the same
answer about whether it is finished. Twice this quarter we pulled something in,
the engineer built what the ticket said, and it bounced in review because
"finished" turned out to mean two different things to two people. Both times we
lost most of a sprint.

So: for each of the three, tell me whether it can go in on Monday, whether it
needs something answered first, or whether it cannot go in at all. Where a
ticket is not ready, give me the exact wording to put in its place — I will be
editing these live in the planning meeting and I am not going to compose
sentences while nine people watch.

Fair warning: these three were written by three different people and they look
nothing like each other. One of them is going to annoy you. Judge them on
whether the engineer and the tester land in the same place, not on how they
read.

## Output Specification

Write `docs/refinement-triage.md`. For each of ENG-812, ENG-820 and ENG-834:

1. The call — goes in, needs an answer first, or cannot go in.
2. A row per acceptance criterion you have a problem with, saying what is wrong
   with it and giving the exact replacement wording.
3. Nothing for the criteria you have no problem with, beyond noting they are
   fine.

Then say which of the three you would hand to the engineers first.

Leave `tickets/ENG-812.md`, `tickets/ENG-820.md` and `tickets/ENG-834.md`
untouched; I edit those myself in the meeting.

## Input Files

Extract the following files before beginning.

=============== FILE: tickets/ENG-812.md ===============
ENG-812

csv export on /reports

esther asked for this on the call again. build it.

click the Export button on /reports, browser downloads
reports-YYYY-MM-DD.csv where the date is the user's local date. utf-8 with a
BOM. header row is the visible column labels left to right in the order they
are on screen. one data row per row currently shown after filtes are applied,
in the same order. cap is 50000 rows - past that we write the first 50000 and
show the toast "Showing first 50,000 rows".

owner and member roles can do it. viewer role gets 403 from
GET /api/reports/export and the button is not rendered for them.

=============== FILE: tickets/ENG-820.md ===============
ENG-820

## Reorder experience

**As a** returning customer
**I want** reordering to feel effortless
**so that** I can restock without friction.

### Background

Reorder is the second most-used surface in the app and carries the lowest
satisfaction score in the November survey. Design has signed off on the frames
in `Reorder-2026Q1` and Growth already has the funnel instrumented end to end,
so we can measure whatever we decide to measure from day one.

### Acceptance criteria

1. The reorder flow is intuitive and requires minimal thought from the
   customer.
2. Performance is best-in-class.
3. The reorder screen is visually consistent with the rest of the app.
4. Error states are handled gracefully.

### Definition of done

- [ ] Reviewed by two engineers
- [ ] Ships behind the `reorder_v2` flag
- [ ] Growth dashboard updated
- [ ] Release note drafted

=============== FILE: tickets/ENG-834.md ===============
ENG-834

## Bulk invite

**As an** org admin
**I want** to invite several teammates at once
**so that** I do not have to add them one at a time.

### Acceptance criteria

1. Addresses pasted into the invite box create one `pending` invite row for
   every address that passes the same RFC 5322 addr-spec check the
   single-invite form already uses, and an inline error appears under the box
   naming each address that fails it.
2. An invite not accepted within 7 days of creation moves to `expired`, and its
   accept link returns `410`.
