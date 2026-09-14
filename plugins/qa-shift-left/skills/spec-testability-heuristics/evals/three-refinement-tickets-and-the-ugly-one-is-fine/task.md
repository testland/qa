# Callum sent one of these back and I want a second read before Monday

## Problem Description

Three tickets sit at the top of the backlog and they go into refinement Monday
at 10. I am not asking you to size them and I am not asking which of them
matters most — I settled that on business grounds last week and I am not
reopening it in front of nine people.

What I want is the filter we keep forgetting to apply. A ticket is only safe to
start here if the engineer who picks it up and the tester who signs it off will
arrive at the same answer about whether it is finished. Twice this quarter we
started something, the engineer built exactly what the ticket said, and it
bounced in review because "finished" turned out to mean two different things to
two people. Both times we lost most of a sprint.

Callum is our staff engineer. He read ENG-812 last week and sent it straight
back to Dev with three lines about the state it was in, and Dev has not touched
it since. Callum is usually right about this sort of thing, which is why I want
someone else's read before I back him on Monday.

One more while you are in there. Esther has been asking for the export on
ENG-812 for two quarters and she reckons the 50,000-row cap on it is plenty for
anybody. Is she right?

## Output Specification

Write `docs/refinement-triage.md`. For each of ENG-812, ENG-820 and ENG-834, say
where the ticket stands and what would have to happen before the squad starts on
it. Then answer Esther's question.

## Input Files

Extract the following files before beginning.

=============== FILE: tickets/ENG-812.md ===============
ENG-812

csv export on /reports

esther asked for this on the call again. build it.

click the Export button on /reports, browser downloads
reports-YYYY-MM-DD.csv where the date is the user's local date. utf-8 with a
BOM, CRLF line endings. header row is the visible column labels left to right
in the order they are on screen. one data row per row currently shown after
filtes are applied, in the same order.

every field is wrapped in double quotes. a field that contains a double quote
has that quote escaped as \" - backslash then quote - so excel does not swallow
the rest of the line.

cap is 50000 rows - past that we write the first 50000 and show the toast
"Showing first 50,000 rows".

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
