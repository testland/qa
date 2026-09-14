# Ticket board export — every ticket referenced in .zap/rules.tsv

| Ticket   | Title                                                | State  | Closed      |
|----------|------------------------------------------------------|--------|-------------|
| ops-2184 | Enable HSTS on the legacy host                       | Closed | 2026-03-04  |
| ops-2199 | Fix cross-domain configuration on the CDN origin     | Closed | 2026-03-19  |
| ops-2231 | Replace the legacy session cookie                    | Open   | —           |
| ops-2307 | Strip the build banner from production responses     | Open   | —           |
| ops-2312 | Tighten the wildcard in the content security policy  | Open   | —           |

Notes from the board:

- ops-2184 was closed by PR #1904, "legacy host now serves HSTS on every
  response". The legacy host still exists and still serves `/legacy/*`.
- ops-2199 was closed by PR #1958. Verified by the reporter at the time.
- ops-2231 has been open since 2025-11. Owner: platform (lead @dstokes).
- ops-2307 owner: platform (lead @dstokes).
- ops-2312 owner: web (lead @mira.k).
- The old admin pages referenced in the 40012 comment are served from
  `https://app.veridianpay.dev/admin/legacy/*` only. Everything else on
  `app.veridianpay.dev`, including the whole customer-facing product and the
  new checkout host, is current code.
