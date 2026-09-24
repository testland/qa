# Credential register — vantage platform

Every credential we have ever invalidated at its provider. Append-only,
platform-security signs each row.

| Date | Credential | Where it was | Action at provider | Ticket |
|---|---|---|---|---|
| 2024-03-11 | GitHub PAT (release bot) | `.ci/release.sh` | revoked | OPS-590 |
| 2025-08-19 | Grafana service token | `services/reporting/exporter.py` | rotated, new value issued into Vault | OPS-472 |

Fabricated values kept in the repository on purpose, signed off 2024-02-19
under OPS-601: `tests/fixtures/sdk-checkout.json`,
`tests/fixtures/sdk-refund.json`, `tests/fixtures/tls/localhost.pem`.

Nothing else in this repository has ever been invalidated at its provider.
`deploy/keys/ci_deploy_rsa` is the key pair the deploy account authenticates
with today; its public half is registered as a deploy key on three repositories.
