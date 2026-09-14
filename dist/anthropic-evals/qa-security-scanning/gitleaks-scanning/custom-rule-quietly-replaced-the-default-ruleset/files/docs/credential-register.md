# Credential register — extract, 2026-07-01 to today

| Date | Credential | Action | Confirmed at provider | Ticket | By |
|---|---|---|---|---|---|
| 2026-08-05 | Slack bot token `xoxb-…`, alerting relay | revoked, reissued into Vault | yes — Slack admin shows the old token revoked; it returns `invalid_auth` | SEC-880 | p.naidu |

No other entries in this window. The register is the only record we keep of a
credential being invalidated at its provider, and platform-security signs each
row before it is added.
