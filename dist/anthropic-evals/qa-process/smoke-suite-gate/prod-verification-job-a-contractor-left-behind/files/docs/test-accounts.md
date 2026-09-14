# Seeded data by environment — checked with @platform 2026-09-08

| Environment | Account | Capability |
|---|---|---|
| staging | `verify@lumen-test.io`, password in `VERIFY_STAGING_EMAIL` / `VERIFY_STAGING_PASSWORD` | full rights, can create and delete freely; database is reset nightly |
| production | `verify@lumen.io`, password in `VERIFY_PROD_EMAIL` / `VERIFY_PROD_PASSWORD` | full rights, the same as any customer account |
| production | order `LUM-SEED-4` | closed order placed 2025-11-04, attached to `verify@lumen.io`, flagged undeletable in the admin tool |
| both | plan item `LUM-PLAN-TEAM`, £39.00 | flagged protected, cannot be delisted by merchandising |

Admin API:

| Environment | Secret | Notes |
|---|---|---|
| staging | `ADMIN_TOKEN` (staging) | full read and write against the staging database |
| production | `ADMIN_TOKEN` (production) | full read and write against the production database |

Payment credentials:

| Environment | Secret | Notes |
|---|---|---|
| staging | `STRIPE_TEST_SECRET` | test mode; card `4242 4242 4242 4242` authorises, `4000 0000 0000 0002` declines |
| production | `STRIPE_LIVE_SECRET` | live mode. Real money. |
