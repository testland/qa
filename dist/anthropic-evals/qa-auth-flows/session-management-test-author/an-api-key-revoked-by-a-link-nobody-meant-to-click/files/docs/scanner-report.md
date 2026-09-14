# Aurelia DAST, run 214 — ledgerly.app, 4 September

Three findings, all class **CSRF: state-changing request without anti-forgery
token**, severity High.

| # | Endpoint | Method | Scanner note |
|---|---|---|---|
| 1 | `/account/keys/revoke` | GET | no token parameter or header observed |
| 2 | `/account/export` | GET | no token parameter or header observed |
| 3 | `/account/sessions` | GET | no token parameter or header observed |

> **Scanner caveat, printed on every report.** Aurelia flags every
> authenticated GET it cannot prove is safe. It does not parse response
> bodies, it does not diff server state between runs, and it does not
> distinguish a read from a write. Triage each finding against the
> application.

Not flagged by this run: `POST /billing/plan` — a token header was observed on
the requests Aurelia replayed.
