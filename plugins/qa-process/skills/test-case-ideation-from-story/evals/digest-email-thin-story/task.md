# Weekly digest story is going into the sprint on Monday

## Problem Description

NOTIF-31 is on the board for sprint planning on Monday. It came from a customer
call, was written up in about five minutes, and has not been through refinement.

The last time we took a notification story in at this quality, the team built
it, QA signed off against the acceptance criteria as written, and we found out
in production that the digest was going to every account in the database
including trial accounts that had never logged in, and that a customer who had
unsubscribed from marketing email was still getting it. Both were defensible
readings of the story. Neither had been asked about.

Engineering wants the case list up front, and the delivery lead wants to know
before Monday whether this story can be estimated as written or whether it
needs to go back for a refinement pass first.

## Output Specification

1. Produce `docs/test-cases/NOTIF-31.md`. It must serve both readers: the
   tester who will eventually execute against it, and the delivery lead who has
   to make the Monday call.
2. Anything in the document that rests on a reading of the story rather than on
   the story itself must be visibly identifiable as such by someone skimming.
3. Out of scope: automated tests, the email template's HTML, and the
   deliverability of our sending domain.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/NOTIF-31.md ===============
# NOTIF-31 — Weekly digest email

**Type:** Story
**Status:** Backlog (not refined)
**Raised by:** Customer call — Northwind, 2026-08-04

## Story

Send a weekly digest email summarising what happened in the workspace, so
people who do not log in every day stay in the loop.

## Acceptance criteria

- AC-1: The digest goes out on Monday at 08:00.
- AC-2: It summarises the previous 7 days: items created, items completed,
  comments, and members joined.
- AC-3: It links back into the workspace.
- AC-4: There is an unsubscribe link in the footer.

## Comments

**@priya (PM), 2026-08-05:** Northwind specifically asked for this on their
call, they have ~400 people in one workspace.

**@tomas (eng), 2026-08-06:** we already have the transactional sender wired
up, this is mostly a scheduled job plus a template. Should be small.
