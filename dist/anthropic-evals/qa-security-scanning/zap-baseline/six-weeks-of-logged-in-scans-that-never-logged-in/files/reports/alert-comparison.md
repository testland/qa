# Nightly report, before and after the authentication change

| | 2026-07-25 (before) | 2026-09-09 (after) |
|---|---|---|
| Alerts | 11 | 11 |
| URLs in the site tree | 4 | 4 |
| Run time | 2m 10s | 2m 14s |

The four URLs, both nights, identical:

```
https://console.brightpath.dev/
https://console.brightpath.dev/pricing
https://console.brightpath.dev/status
https://console.brightpath.dev/signup
```

All eleven alerts are against those four URLs both nights. Nine are header and
cookie alerts on `/` and `/pricing`. Two are on `/signup`.

Screens that exist behind the login and appear in neither report: the tenant
list, per-tenant settings, the user admin pages, API token management, the audit
log, billing, the runbook editor, the alert-rule editor, the integrations pages,
the export tool, and everything under `/admin/`. Roughly forty in total; the
router table is in the frontend repo if you need the exact list.
