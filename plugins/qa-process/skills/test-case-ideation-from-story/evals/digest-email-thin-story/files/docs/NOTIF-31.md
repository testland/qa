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
