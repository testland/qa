# Pilot scan — atlas-core @ 7c31d0b — 2026-09-04

Command: `semgrep scan --config p/owasp-top-ten --config p/javascript --json`
Duration: 6m 41s. Files scanned: 2,914. Rules: 1,042.

## By severity

| Severity | Findings |
|---|---|
| ERROR   | 212   |
| WARNING | 1,338 |
| INFO    | 297   |
| **Total** | **1,847** |

## By directory

| Path | ERROR | WARNING | INFO | Total |
|---|---|---|---|---|
| src/legacy/    | 168 | 1,109 | 227 | 1,504 |
| src/billing/   | 21  | 94    | 31  | 146   |
| src/api/       | 14  | 79    | 22  | 115   |
| src/web/       | 6   | 41    | 14  | 61    |
| scripts/       | 3   | 15    | 3   | 21    |

## Findings first introduced in the last 14 days

Cross-referenced against `git log --since=2026-08-21`:

| Rule | Severity | Path | Introduced |
|---|---|---|---|
| javascript.lang.security.audit.sqli.node-postgres-sqli | ERROR | src/billing/invoices/query.js:88 | 2026-08-26 (#4471) |
| javascript.lang.security.detect-child-process | ERROR | src/api/exports/archive.js:31 | 2026-09-01 (#4502) |
| javascript.jwt.security.jwt-hardcode.hardcoded-jwt-secret | ERROR | src/api/auth/dev-token.js:12 | 2026-09-02 (#4509) |

The other 1,844 predate 2026-08-21.

## Top rules by count

| Rule | Severity | Count |
|---|---|---|
| javascript.express.security.audit.express-cookie-session-no-secure | WARNING | 61 |
| javascript.lang.security.audit.path-traversal.path-join-resolve-traversal | WARNING | 143 |
| javascript.lang.best-practice.leftover-debugging | INFO | 211 |
| javascript.express.security.audit.express-open-redirect | WARNING | 88 |
