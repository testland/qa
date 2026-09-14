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
cookie alerts on `/` and `/pricing`. Two are on `/signup`. The eleven have the
same rule ids on both nights. None of the eleven has a ticket against it in the
tracker; the oldest report still in artifact retention, 2026-06-28, lists the
same eleven.

The frontend router table has 46 entries. Five of them are the public pages and
the login page. The rest — the tenant list, per-tenant settings, user admin, API
token management, the audit log, billing, the runbook editor, the alert-rule
editor, the integrations pages, the export tool and everything under `/admin/` —
appear in neither report.
