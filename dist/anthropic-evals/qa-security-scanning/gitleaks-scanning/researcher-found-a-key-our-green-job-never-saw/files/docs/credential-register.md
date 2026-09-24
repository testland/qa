# Credential register — hexley platform, all entries

Every credential we have ever invalidated at its provider, oldest first. The
register is append-only and platform-security signs each row.

| Date | Credential | Where it was | Action at provider | Ticket |
|---|---|---|---|---|
| 2021-09-30 | GCP service-account key | `ops/exporter/legacy-sa.json` | key deleted | OPS-204 |
| 2022-11-04 | npm automation token | `.npmrc.ci` | revoked | OPS-388 |
| 2023-02-14 | Twilio API key | `ops/sms/legacy_send.rb` | rotated, old key deleted | OPS-455 |
| 2024-01-08 | GitHub PAT (release bot) | `.ci/legacy-release.sh` | revoked | OPS-590 |
| 2024-06-12 | Slack bot token | `ops/alerting/relay.py` | revoked, reissued into Vault | OPS-641 |

Fabricated values that are deliberately kept in the repository, signed off
2024-02-19 under OPS-601: `tests/fixtures/sdk-init.json`,
`tests/fixtures/signing-dev.pem`, `tests/fixtures/tls/localhost.pem`. None of
the three has ever corresponded to a real account or certificate authority.

Nothing else in this repository has been invalidated at its provider.
