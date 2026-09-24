# What `9c1e2f4` is

```
$ git log -1 --format='%h %ad %an%n%n    %s' --date=short 9c1e2f4
9c1e2f4 2025-11-18 i.petrov

    import: move payments-sdk and billing into the platform monorepo

$ git show --stat 9c1e2f4 | tail -1
 1904 files changed, 214870 insertions(+)
```

`git show --name-only 9c1e2f4 -- services deploy tests | head -14`

```
services/billing/config/prod.env
services/billing/config/staging.env
services/billing/handler.go
services/billing/router.go
services/checkout/client.go
services/checkout/retry.go
deploy/keys/ci_deploy_rsa
deploy/keys/ci_deploy_rsa.pub
deploy/terraform/billing.tf
deploy/terraform/checkout.tf
tests/fixtures/sdk-checkout.json
tests/fixtures/sdk-refund.json
tests/harness/replay.go
tests/harness/stub_server.go
```

Every path above is still present at HEAD. `services/billing/config/prod.env`
has had exactly one change since the import: `b7d0e41` (2026-05-02, m.abioye)
added the Twilio credentials on lines 8-9. Nothing else in that file has been
touched since 2025-11-18.

Scanner version pinned at v8.24.2 in `.github/workflows/secret-scan.yml` since
2026-01-09, unchanged. `git log -- .gitleaks.toml` shows two commits: the
initial config on 2026-01-09 and Ilya's on 2026-04-02.
