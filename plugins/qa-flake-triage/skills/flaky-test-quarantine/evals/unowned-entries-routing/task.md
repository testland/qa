# Five switched-off tests and nobody attached to any of them

## Problem Description

We have five tests currently out of the blocking path. Each one has a date, a
rate, and a ticket number, so on paper the list is in reasonable shape. What it
does not have is any indication of who is supposed to do anything about them.

That became a problem last week. Two of the five hit their review dates, our
weekly report posted them to the platform channel, and nothing happened,
because the report goes to a channel with 140 people in it and no individual
was named. Both are still sitting there.

I want to fix the routing before I fix anything else. I have `CODEOWNERS` and
our current team roster. Two things to watch: `@growth-experiments` was
dissolved in the May reorg and its handle no longer resolves in GitHub, and one
of the five test files is not matched by any `CODEOWNERS` rule at all.

Do not guess. If a test cannot be routed to a team that currently exists, I
need that stated as a blocker rather than papered over with a plausible-looking
handle, because a wrong handle is worse than a blank one — it looks assigned
and it never gets read.

## Output Specification

1. Rewrite `docs/skipped-tests.md` with routing resolved.
2. Write `docs/routing-blockers.md` for any entry you could not route from the
   supplied files, stating what specifically is missing and who decides.
3. Do not change any review date, rate, or ticket number in the existing
   entries.

## Input Files

Extract the following files before beginning.

=============== FILE: docs/skipped-tests.md ===============
# Tests currently out of the blocking path

| ID   | Test                            | Spec file                        | Out since  | Rate  | Review by  | Owner |
|------|---------------------------------|----------------------------------|------------|-------|------------|-------|
| S-01 | checkout applies regional tax   | tests/checkout/tax.spec.ts       | 2026-07-18 | 12.2% | 2026-08-17 |       |
| S-02 | referral banner shows bonus     | tests/growth/referral.spec.ts    | 2026-07-22 | 8.4%  | 2026-08-21 |       |
| S-03 | onboarding tour advances        | tests/growth/onboarding.spec.ts  | 2026-08-01 | 6.7%  | 2026-08-31 |       |
| S-04 | search returns paged results    | tests/search/paging.spec.ts      | 2026-08-04 | 7.0%  | 2026-09-03 |       |
| S-05 | admin audit trail records edits | tests/admin/audit.spec.ts        | 2026-07-30 | 9.1%  | 2026-08-29 |       |

=============== FILE: CODEOWNERS ===============
# Ownership for the e2e suite
tests/checkout/          @web-platform
tests/growth/            @growth-experiments
tests/search/            @search
# tests/admin/ intentionally left out during the 5.2 split, see #4980

=============== FILE: docs/teams.md ===============
# Current engineering teams (updated 2026-08-01)

| Handle           | Lead        | Scope                                   | Status                     |
|------------------|-------------|-----------------------------------------|----------------------------|
| @web-platform    | @kdavies    | checkout, cart, billing surfaces         | active                     |
| @search          | @nrahimi    | search, indexing, relevance              | active                     |
| @messaging       | @tobrien    | email, push, in-app notifications        | active                     |
| @growth-experiments | —        | referrals, onboarding, experiments        | dissolved in the May reorg |
| @qa-guild        | @lpetrova   | test infrastructure, CI, suite health     | active                     |

Notes:
- The May reorg moved growth surfaces to product squads that have not yet been
  registered as GitHub teams. @lpetrova is chairing the reassignment.
- `tests/admin/` ownership is unresolved; #4980 has been open since the 5.2
  split with no decision.
- @qa-guild owns the suite mechanics. It does not own product behaviour and
  cannot fix product-side failures.
