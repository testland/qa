# Ticket board export — every ticket referenced in .zap/rules.tsv

| Ticket   | Title                                               | State  | Closed     | Owner             |
|----------|-----------------------------------------------------|--------|------------|-------------------|
| ops-2184 | Enable HSTS on the legacy host                      | Closed | 2026-03-04 | platform          |
| ops-2199 | Fix cross-domain configuration on the CDN origin    | Closed | 2026-03-19 | platform          |
| ops-2231 | Replace the legacy session cookie                   | Open   | —          | platform @dstokes |
| ops-2307 | Strip the build banner from production responses    | Open   | —          | platform @dstokes |
| ops-2312 | Tighten the wildcard in the content security policy | Open   | —          | web @mira.k       |

Hosts in the estate, from the DNS export:

| Host                         | First served | Notes from the platform wiki              |
|------------------------------|--------------|-------------------------------------------|
| app.veridianpay.dev          | 2021-04      | the customer product                      |
| app.veridianpay.dev/legacy/* | 2019-08      | reporting pages from the pre-2021 product |
| app.veridianpay.dev/admin/*  | 2021-04      | internal back office                      |
| checkout.veridianpay.dev     | 2026-07-28   | split out of app/, current code           |
