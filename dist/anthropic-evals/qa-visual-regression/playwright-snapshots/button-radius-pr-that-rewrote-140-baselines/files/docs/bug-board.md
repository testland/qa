# Open bugs, web, as of 2026-09-09

| ID       | Opened     | Area       | Title                                                                   | State |
|----------|------------|------------|-------------------------------------------------------------------------|-------|
| BUG-4402 | 2026-07-30 | search     | Recent-searches dropdown keeps focus after Escape                       | open  |
| BUG-4418 | 2026-08-03 | nav        | Primary nav wraps to two lines at exactly 1024px                        | open  |
| BUG-4427 | 2026-08-09 | onboarding | Step 3 "Skip" link is not keyboard reachable                            | open  |
| BUG-4440 | 2026-08-14 | docs       | Code blocks lose syntax colours after theme toggle                      | open  |
| BUG-4455 | 2026-08-21 | checkout   | Promo code accepted twice if submitted quickly                          | open  |
| BUG-4471 | 2026-08-28 | account    | Billing tab renders an empty card plus a console error when the account has no payment method on file; reproduces on every seeded CI account | open |
| BUG-4480 | 2026-09-01 | home       | Hero video autoplays on metered connections                             | open  |
| BUG-4488 | 2026-09-03 | search     | Filter chips overflow on narrow viewports                               | open  |
| BUG-4495 | 2026-09-04 | account    | Team invite email uses the old logo                                     | open  |
| BUG-4501 | 2026-09-07 | docs       | Anchor links jump 64px past the heading                                 | open  |

Seed accounts used by CI (`docs/ci-seeds.md`, unchanged since June): the
`settings` spec and the `account` spec both run against `seed-acct-03`, which
has no payment method attached, by design.
