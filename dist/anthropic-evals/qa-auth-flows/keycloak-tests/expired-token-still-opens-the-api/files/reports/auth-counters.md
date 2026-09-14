# orders-api auth counters, 180 days (2026-03-15 to 2026-09-11)

Pulled by @kpatel off the platform dashboard. These are emitted by
`src/require-auth.js` on each branch it takes.

| counter                  | total      |
|--------------------------|------------|
| auth.request             | 41,208,714 |
| auth.missing_token       |     92,331 |
| auth.introspection.ok    |          0 |
| auth.token_inactive      |          0 |
| auth.degraded            | 41,116,383 |

SSO server availability over the same window, from the platform team's own
dashboard: 100%. The last recorded unavailability of that server was the
2026-03-14 outage, which is outside this window.
