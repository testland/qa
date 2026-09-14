# The `qa` realm on sso-staging

Maintained by hand in the admin console since 2023. Nobody has an export of it.

| Thing | Value |
|---|---|
| Realm | `qa` |
| Seeded users | `alice`, `bob` - created when the realm was, passwords in the team vault |
| Client | `svc-reports`, confidential, service account enabled, secret `qa-shared-secret` |
| Admin account the suite uses | `ci-runner` in the `master` realm, credentials in repository secrets |
| Who else has admin | the platform team, and anyone they have shared `ci-runner` with |

The two seeded users exist only so `test_realm_has_exactly_the_seeded_users` has a
fixed baseline to compare against. Nothing else reads them.
