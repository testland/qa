# The `corp-staging` realm

Maintained by the platform team in the admin console. We do not own it; we
re-export it each quarter and diff the export against what we have committed, so
that the suite keeps matching the realm the portal actually runs against.

| Thing | Where it lives |
|---|---|
| `svc-reports`, `corp-portal` | defined in the realm itself |
| `svc-nightly` | defined in the realm itself, password set by the platform team |
| `alice` and every other named person | the corporate directory; the realm links to it |
| Role `reports-reader` | defined in the realm itself |

Note from the platform team, 2026-08: they are not going to stop using the
directory for people accounts, so do not ask.
