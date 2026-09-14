# Credential register — orion-platform

Every credential we have invalidated at its provider. Append-only.

| Date | Credential | Where it was | Action at provider | Ticket |
|---|---|---|---|---|
| 2021-02-17 | GitHub PAT (release bot) | `.ci/old-release.sh` | revoked | OPS-140 |
| 2021-08-30 | GCP service-account key | `infra/legacy/sa-analytics.json` | key deleted | OPS-201 |
| 2022-06-04 | Twilio API key | `services/sms/legacy_client.py` | rotated | OPS-266 |
| 2023-01-19 | npm automation token | `.npmrc.bak` | revoked | OPS-318 |
| 2024-05-22 | deploy SSH key | `deploy/keys/deploy_rsa` | key removed from all repos | OPS-402 |

Fabricated values kept in the repository on purpose, signed off 2024-02-19
under OPS-601: `tests/fixtures/sdk-init.json`.

Nothing else in this repository has been invalidated at its provider. The Slack
bot token in `ops/legacy/notify.rb` and the Slack webhook in
`ops/legacy/alert.sh` were never touched; both files were deleted from `main` in
2022 when the notifier was replaced. The value at `docs/archive/2020-runbook.md`
line 142 is the shared reporting API key that the analytics exporter still
authenticates with today.
