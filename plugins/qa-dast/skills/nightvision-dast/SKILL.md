---
name: nightvision-dast
description: Configures and runs NightVision — "white-box-assisted Dynamic Application Security Testing (DAST) tool" that "analyzes code before simulating attacks and traces findings back to their origin"; supports OpenAPI / Postman / GraphQL / web app + REST API targets; auth via Interactive Logins / Header & Cookie / TOTP; per-finding suppression via Alert Rules; CLI integration via `nightvision` command. Use when the team needs DAST that traces findings back to source code (white-box-assisted) on top of OWASP ZAP's pure black-box approach.
rating: 22
d6: 4
archetype: S1
---

# nightvision-dast

## Overview

Per [docs.nightvision.net][nv-docs]:

[nv-docs]: https://docs.nightvision.net/

> "NightVision is a white-box-assisted Dynamic Application Security
> Testing (DAST) tool" that "helps you identify security vulnerabilities
> in web applications and REST APIs."

The white-box-assistance differentiator: NightVision "analyzes code
before simulating attacks and traces findings back to their origin"
per [nv-docs][nv-docs]. This source-traceability is the value-add
over pure-black-box DAST tools (ZAP / Burp).

## When to use

- The team needs source-traceable DAST (findings link to specific
  code locations, not just URLs).
- API-heavy repo with OpenAPI / Swagger / GraphQL specs available
  as the scan target.
- Team wants spec-driven coverage (NightVision derives request
  surface from API specs vs crawling).
- Layered with [`zap-baseline`](../zap-baseline/SKILL.md) for
  combined coverage.

## Step 1 — Install

Per [nv-docs][nv-docs] the CLI is documented in "Installing the
CLI"; consult the live docs for current install commands per
platform. Typical pattern:

```bash
# Linux/macOS install (verify against docs.nightvision.net)
curl -fsSL https://install.nightvision.net | sh

# Verify
nightvision --version

# Authenticate
nightvision login
```

## Step 2 — Target type support

Per [nv-docs][nv-docs] the platform supports:

| Target type | How |
|---|---|
| OpenAPI / Swagger spec | Upload via CLI / dashboard |
| Postman collection | Upload via CLI / dashboard |
| GraphQL endpoint | Configure via API Discovery framework |
| Public web app URL | Standard URL target |
| Authenticated web app | + auth recorder configuration (Step 4) |
| Public REST API | Standard URL target |
| Authenticated REST API | + Header / Cookie / TOTP auth |

Spec-driven targets give the scanner full request-shape knowledge
(query params, body schemas, content types); crawl-based targets
only see what the spider discovers.

## Step 3 — Basic scan

```bash
# Scan an OpenAPI-described API
nightvision scan create \
  --name "my-api-staging" \
  --target-url https://api.example.com \
  --spec ./openapi.yaml \
  --auth header \
  --auth-header "Authorization: Bearer $TOKEN"

# Wait for completion + retrieve findings
nightvision scan get <scan-id> --wait
nightvision scan results <scan-id> --output json > findings.json
```

(Exact CLI verb names per [nv-docs][nv-docs] current release.)

## Step 4 — Authentication

Per [nv-docs][nv-docs] the platform supports:

| Auth type | Use |
|---|---|
| Interactive Logins | Record a browser-side login flow; replay during scan |
| Header authentication | Static token in HTTP header |
| Cookie authentication | Static cookie value |
| TOTP authentication | Time-based OTP for 2FA-protected apps |

For interactive logins, the auth recorder captures the login flow
in the dashboard UI; the recording is saved + referenced by name
in subsequent scans.

## Step 5 — Scope control

Per [nv-docs][nv-docs] "Scope Control" defines:

- Include patterns (URL globs in scope)
- Exclude patterns (URL globs out of scope; e.g., `/admin/*` for
  admin-protected zones, `/static/*` for non-app assets)
- Per-method exclude (e.g., skip DELETE on `/users/*`)
- Per-finding-type include/exclude

Tightening scope is essential — un-scoped scans hit unintended
endpoints + waste scan budget.

## Step 6 — False-positive triage (MANDATORY)

Per [nv-docs][nv-docs] "Alert Rules" govern per-finding suppression:

| Mechanism | Use |
|---|---|
| Alert Rule (dashboard / API) | Suppress per (finding-type, URL-pattern) tuple |
| Scope exclusion | Skip whole URL trees |
| Severity threshold | Filter low-severity findings |
| Mark-as-FP per scan | Persistent across re-runs |

**Justification template (mandatory in Alert Rules):**

```
Alert Rule: Suppress "SQL Injection" on /search?q=
Reason: parameter pre-validated via Joi schema; verified safe in code review
Reviewer: alice@example.com (2026-05-15)
Expires: 2026-12-15
Re-review-date: 2026-12-15
```

Cadence: every quarter, audit Alert Rules in the dashboard;
expired rules removed; persistent ones reviewed.

## Step 7 — Output formats + integration

`nightvision scan results <id> --output FORMAT`:

- `json` — for [`dast-finding-triager`](../../agents/dast-finding-triager.md)
- `sarif` — for GitHub Code Scanning
- `csv` — for spreadsheet review
- `pdf` — for compliance reports

## Step 8 — CI integration

```yaml
jobs:
  nightvision:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: |
          curl -fsSL https://install.nightvision.net | sh
          nightvision login --token ${{ secrets.NV_TOKEN }}
          SCAN_ID=$(nightvision scan create \
            --name "ci-${{ github.run_id }}" \
            --target-url https://staging.example.com \
            --spec ./openapi.yaml \
            --auth header \
            --auth-header "Authorization: Bearer ${{ secrets.STAGING_TOKEN }}" \
            --output json | jq -r '.id')
          nightvision scan get $SCAN_ID --wait
          nightvision scan results $SCAN_ID --output sarif > nightvision.sarif
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with: { sarif_file: nightvision.sarif }
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Crawl-based scan when OpenAPI spec exists | Misses unspidered endpoints | Always use `--spec` if available (Step 3) |
| Scan production | Active probes risk data corruption | Staging only |
| Skip scope exclusion | Tests waste budget on out-of-scope URLs | Configure scope (Step 5) |
| Suppress without `Re-review-date` | Permanent FP debt | Required template (Step 6) |
| Hardcode auth tokens in CI logs | Token leak | Use CI secret + redact (`::add-mask::` in GHA) |

## Limitations

- Commercial product — pricing model varies; check
  nightvision.net for current.
- White-box-assistance requires source-code awareness — most useful
  for codebases NightVision can analyze (consult docs for
  language coverage).
- For pure black-box DAST without commercial cost, use
  [`zap-baseline`](../zap-baseline/SKILL.md) + [`burp-headless`](../burp-headless/SKILL.md)
  combination instead.
- Per [nv-docs][nv-docs] CLI / API / dashboard surface evolves;
  pin a CLI version in CI.
- TOTP auth is supported but configuration is fragile when MFA
  policy changes.

## References

- [nv-docs][nv-docs] — official documentation
- nightvision.net — product page
- [`zap-baseline`](../zap-baseline/SKILL.md),
  [`burp-headless`](../burp-headless/SKILL.md) — sister DAST tools
- [`dast-baseline-runner`](../dast-baseline-runner/SKILL.md) —
  build-an-X for layered DAST
- [`dast-finding-triager`](../../agents/dast-finding-triager.md) —
  unifier agent
