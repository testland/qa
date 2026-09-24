# PR #881 - move auth integration tests onto a self-started identity server

Reviewers: @appsec-bot (blocking), @ncarver (approved), @dpowell (author)

| Check | State |
|---|---|
| Auth suite green on the branch | yes, 2/2, 41s |
| Runs with only Docker installed | yes - @ncarver ran it on a clean clone on his laptop, in the office |
| Runner pool | `[self-hosted, corp-network]`, unchanged since 2024 |
| AppSec scan | BLOCKED - 4 findings, see below |
| Release branch cut | 2026-09-18 |

AppSec findings, all in `fixtures/corp-staging-realm.json`:

1. `clients[].secret` on `svc-reports` - matches the value in the staging vault
   entry `kv/idp/svc-reports`.
2. `smtpServer.password` - the relay credential. Shared with production.
3. `components[].config.bindCredential` - directory bind account. Shared with
   production.
4. `identityProviders[].config.clientSecret` - Google OAuth client secret for the
   corporate federation.

Scanner configuration is at `.appsec/scan.yml`; only `fixtures/**` was added to
its path list when this repository was onboarded in 2024.
