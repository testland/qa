# Snyk `.snyk` policy and false-positive triage

## `.snyk` policy file

Per Snyk's policy-file model (consult docs.snyk.io for current
schema), `.snyk` lives at the project root and supports:

```yaml
# .snyk
version: v1.0.0
ignore:
  SNYK-JS-LODASH-567746:
    - '*':
        reason: "False positive; we don't pass user input to Lodash sortBy"
        expires: '2026-12-15T00:00:00.000Z'
        created: '2026-05-15T00:00:00.000Z'
patch: {}
```

Per-vuln ignore can be scoped to specific paths (`* > lodash`,
`my-package > lodash`) and **must include an `expires:` field** - Snyk policy validates this at scan time.

## False-positive triage (MANDATORY)

Three suppression layers:

| Mechanism | Where | Use |
|---|---|---|
| `.snyk` policy file ignore (with expiration) | Repo root | Per-vuln + per-path; auditable in git history |
| Snyk dashboard "Ignore" action | snyk.io/app | Org-wide; persistent; reviewer-tracked |
| `--severity-threshold=` filter | CI flag | Scan-time noise reduction (not suppression) |
| `--fail-on=upgradable` flag | CI flag | Only fail if a fix exists; soft gate |

**Justification template (mandatory in `.snyk`):**

```yaml
ignore:
  SNYK-JS-LODASH-567746:
    - '*':
        reason: |
          Reason: Lodash sortBy not exposed to user input;
          attack path requires admin context which is separately
          controlled. Verified in code review (PR #1234).
        approved-by: alice@example.com
        expires: '2026-12-15T00:00:00.000Z'
        created: '2026-05-15T00:00:00.000Z'
        re-review-date: '2026-09-15T00:00:00.000Z'
```

Cadence: every quarter, list `.snyk` policies grouped by
`re-review-date` and process expired entries.
