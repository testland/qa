# Automation framework proposal - Meridian Dispatch

Author: D. Whitlock (contract, ended 2026-09-05)
Status: awaiting sign-off

## Stack

- TypeScript, Playwright Test
- Runs the console tier now and the API tier later through the same runner
- Page objects under `tests/pages/`, extracted as duplication shows up

## Coverage

| Layer   | Covered here                                           |
|---------|--------------------------------------------------------|
| Unit    | No - owned by the dev teams, stays with them           |
| API     | No - out of scope for this phase                       |
| Web E2E | Yes - all 31 console screens, one spec file per screen |

## Account and session fixtures

This is the part I would not change. Creating a dispatch account through the
sign-up flow and then signing in takes 11 seconds end to end. Paying that on
every test is where a suite this shape usually dies.

So `account` and `session` are worker-scoped: one real account is created at
the start of each worker process, every spec that worker runs shares it, and
it is torn down when the worker finishes. Nine specs on four workers pay the
sign-up cost four times per run instead of nine, and the saving gets better
as the suite grows - at 200 specs it is still four.

The fixture module is on the branch at `pilot/fixtures/index.ts`. Specs
import `test` from there, never from `@playwright/test` directly.

## Why this shape

It is the design I built at my previous client, a retail storefront, where it
reached 640 UI specs over two years and held up. The console is where our
users actually are, and it is the part of the product nobody can check
before a release today.

## Known issue

The pilot has been intermittently red since the start of September. I am
fairly confident it is contention on the shared runner image - the failures
move around, they never reproduce on my machine, and a re-run goes green.
Set `retries: 2` in CI and it clears. I have not had time to chase it
further and it should not hold up the sign-off.

## Estimated build

Nine weeks, one engineer.
