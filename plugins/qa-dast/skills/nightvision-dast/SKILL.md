---
name: nightvision-dast
description: "Configures and runs NightVision white-box-assisted DAST: analyzes source code before attacking, traces every finding to its origin line, and drives coverage from OpenAPI / Postman / GraphQL specs rather than crawling. Supports Header, Cookie, TOTP, and recorded Interactive Login auth; exports findings as SARIF for GitHub Code Scanning, plus JSON, CSV, or PDF. Per-finding suppression via Alert Rules; CLI integration via the `nightvision` command. Use when source-traceable findings and spec-driven request coverage matter, not just authenticated black-box scanning (see zap-authenticated-scans for that)."
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
- Layered with `zap-baseline` for combined coverage.

## How to use

1. Install the `nightvision` CLI and authenticate (`nightvision login`).
2. Pick the target: prefer an OpenAPI / Postman / GraphQL spec over a
   crawl URL so the scanner knows the full request surface (see Target types).
3. Create and run a scan against **staging** with the right auth mode, wait
   for it to finish, and pull findings (see Worked example).
4. Triage findings, suppress false positives via Alert Rules with a
   re-review date (see False-positive triage), then wire the scan into CI as
   a SARIF gate - full workflow and scope tuning in
   [references/ci-and-scan-operations.md](references/ci-and-scan-operations.md).

## Install

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

## Target types

Per [nv-docs][nv-docs] the platform supports:

| Target type | How |
|---|---|
| OpenAPI / Swagger spec | Upload via CLI / dashboard |
| Postman collection | Upload via CLI / dashboard |
| GraphQL endpoint | Configure via API Discovery framework |
| Public web app URL | Standard URL target |
| Authenticated web app | + auth recorder configuration (see Authentication) |
| Public REST API | Standard URL target |
| Authenticated REST API | + Header / Cookie / TOTP auth |

Spec-driven targets give the scanner full request-shape knowledge
(query params, body schemas, content types); crawl-based targets
only see what the spider discovers.

## Authentication

Per [nv-docs][nv-docs] the platform supports:

| Auth type | Use |
|---|---|
| Interactive Logins | Record a browser-side login flow; replay during scan |
| Header authentication | Static token in HTTP header |
| Cookie authentication | Static cookie value |
| TOTP authentication | Time-based OTP for 2FA-protected apps |

For interactive logins, the auth recorder captures the login flow
in the dashboard UI; the recording is saved and referenced by name
in subsequent scans.

## Worked example

Scan an OpenAPI-described API on staging with a bearer token, wait for the
run to finish, then export findings as JSON for triage and SARIF for GitHub
Code Scanning:

```bash
# Create a spec-driven scan with header auth
SCAN_ID=$(nightvision scan create \
  --name "my-api-staging" \
  --target-url https://staging.example.com \
  --spec ./openapi.yaml \
  --auth header \
  --auth-header "Authorization: Bearer $TOKEN" \
  --output json | jq -r '.id')

# Block until the scan finishes
nightvision scan get "$SCAN_ID" --wait

# Export findings: json for cross-tool triage, sarif for Code Scanning
nightvision scan results "$SCAN_ID" --output json > findings.json
nightvision scan results "$SCAN_ID" --output sarif > nightvision.sarif
```

(Exact CLI verb names per [nv-docs][nv-docs] current release.)

## False-positive triage (MANDATORY)

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

## Operating in CI

Run the scan against **staging** on push, export `--output sarif`, and upload
it via `github/codeql-action/upload-sarif` so findings land inline on the PR.
Pin a CLI version in CI, and tighten scope control first so scans stay focused
and within budget. The full GitHub Actions workflow, the scope-control
patterns, and the output-format matrix live in
[references/ci-and-scan-operations.md](references/ci-and-scan-operations.md).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Crawl-based scan when OpenAPI spec exists | Misses unspidered endpoints | Always use `--spec` if available (see Worked example) |
| Scan production | Active probes risk data corruption | Staging only |
| Skip scope exclusion | Tests waste budget on out-of-scope URLs | Configure scope (see Operating in CI) |
| Suppress without `Re-review-date` | Permanent FP debt | Required template (see False-positive triage) |
| Hardcode auth tokens in CI logs | Token leak | Use CI secret + redact (`::add-mask::` in GHA) |

## Limitations

- Commercial product - pricing model varies; check
  nightvision.net for current.
- White-box-assistance requires source-code awareness - most useful
  for codebases NightVision can analyze (consult docs for
  language coverage).
- For pure black-box DAST without commercial cost, use
  `zap-baseline` + `burp-headless`
  combination instead.
- Per [nv-docs][nv-docs] CLI / API / dashboard surface evolves;
  pin a CLI version in CI.
- TOTP auth is supported but configuration is fragile when MFA
  policy changes.

## References

- [nv-docs][nv-docs] - official documentation
- nightvision.net - product page
- `zap-baseline`,
  `burp-headless` - sister DAST tools
- `dast-scan-cadence-author` -
  build-an-X for layered DAST
- CI wiring, scope control, and output formats (with their own
  citations): [references/ci-and-scan-operations.md](references/ci-and-scan-operations.md)
