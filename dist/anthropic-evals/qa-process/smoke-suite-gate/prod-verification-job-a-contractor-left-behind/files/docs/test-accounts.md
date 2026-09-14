# Seeded data by environment — checked with @platform 2026-09-08

| Environment | Account | Capability |
|---|---|---|
| staging | `verify@lumen-test.io`, password in `VERIFY_PASSWORD` | full rights, can create and delete freely; database is reset nightly |
| production | `verify-ro@lumen-test.io`, password in `VERIFY_RO_PASSWORD` | read-only role — can sign in, read the dashboard, read its own order history; every write returns 403 |
| production | order `LUM-SEED-4` | closed order placed 2025-11-04, attached to `verify-ro`, flagged undeletable in the admin tool |
| both | plan item `LUM-PLAN-TEAM`, £39.00 | flagged protected, cannot be delisted by merchandising |

Payment credentials:

| Environment | Secret | Notes |
|---|---|---|
| staging | `STRIPE_TEST_SECRET` | test mode; card `4242 4242 4242 4242` authorises, `4000 0000 0000 0002` declines |
| production | `STRIPE_LIVE_SECRET` | live mode. Real money. |
