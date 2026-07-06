---
name: burp-headless
description: "Configures and runs Burp Suite Professional / Enterprise headless - Burp Scanner is \"a web vulnerability scanning tool built into Burp Suite Professional\"; Pro edition runs scans via REST API or scheduled-tasks; Enterprise edition is purpose-built for CI-driven scanning at scale; supports BApp Store extensions (BCheck, custom scanners); auth via session-handling rules. Use when the team has a Burp Suite license and needs paid-tier DAST coverage layered on top of OWASP ZAP."
---

# burp-headless

## Overview

Per [portswigger.net/burp/documentation/desktop/automated-scanning][burp-as]:

[burp-as]: https://portswigger.net/burp/documentation/desktop/automated-scanning

> "Burp Scanner is a web vulnerability scanning tool built into
> Burp Suite Professional. You can use Burp Scanner to automatically
> map the attack surface and identify vulnerabilities in both web
> applications and APIs."

**Important licensing context:** Burp Suite Professional is per-user
desktop tooling - headless / unattended use is licensed
differently. Per [burp-as][burp-as]: there is "Pro" + "Enterprise"
edition; Enterprise is "enterprise-enabled" and purpose-built for
CI-driven scanning. Pro headless is constrained; Enterprise is the
intended CI fit. Verify your license before authoring CI workflows.

## When to use

- The team has a Burp Suite Professional or Enterprise license.
- ZAP coverage isn't sufficient for a specific use case (e.g.,
  Burp's BApp Store has a tool ZAP doesn't).
- A penetration-testing team uses Burp interactively and wants
  CI-runnable scans for the same target.
- Enterprise edition's scheduled scan + dashboard model fits the
  team's scale.

For most teams, [`zap-baseline`](../zap-baseline/SKILL.md) +
[`nightvision-dast`](../nightvision-dast/SKILL.md) cover the same
surface without Burp's licensing friction.

## Step 1 - License + install

Burp Pro: download Burp Suite Pro from portswigger.net/burp/pro;
each user activates via license file. Headless invocation requires
the Pro license to be valid (license-server activation for
multi-user setups).

Burp Enterprise: server-side install per
portswigger.net/burp/documentation/enterprise. Requires dedicated
infrastructure + DB (MySQL/PostgreSQL).

## Step 2 - Pro: REST API for scan control

Burp Pro exposes a REST API (when enabled in User Settings → REST
API). Pattern:

```bash
# Start a scan via Pro REST API
curl -X POST "http://127.0.0.1:1337/v0.1/scan" \
  -H "Content-Type: application/json" \
  -d '{
    "scope": { "include": [{"rule": "https://app.example.com/.*"}] },
    "scan_configurations": [{"name": "Crawl strategy - fastest", "type": "NamedConfiguration"}],
    "urls": ["https://app.example.com/"]
  }'
```

Returns a task ID. Poll for completion + retrieve issues:

```bash
curl http://127.0.0.1:1337/v0.1/scan/<task_id>
```

The REST API surface is documented in Burp's User Settings → REST
API → API Documentation tab.

## Step 3 - Enterprise: CI integration

Burp Enterprise (CI-friendly) workflow:

1. Enterprise server stores scan configurations + targets.
2. CI script triggers a scan via the Enterprise REST API.
3. CI script polls for completion + downloads issues as JSON.
4. CI script parses + gates per severity.

The full CI-driven scanning model is documented per [burp-as][burp-as]
"CI-driven scanning"; consult portswigger.net/burp/documentation/enterprise
for current API endpoints (the surface is stable but per-version
specifics evolve).

## Step 4 - BApp Store extensions

Per [burp-as][burp-as] the "BApp Store" model - extensions distributed
via the in-Burp store. Common useful extensions:

- **BCheck** - custom-rule DSL for Burp; community + paid rules
- **Active Scan++** - additional active scan checks
- **HTTP Request Smuggler** - specialized smuggling tests
- **JWT Editor** - JWT manipulation for auth testing
- **Param Miner** - parameter discovery

For headless / CI use, extensions can be loaded via Burp's
extension config (Burp → Extender → Extensions → Add → load .jar /
.py / BApp). Enterprise edition manages extension allowlists
centrally.

## Step 5 - Authentication via session-handling rules

Burp's session handling is rule-based (User Options → Sessions →
Session Handling Rules). Each rule defines:

- Scope (which URLs trigger this rule)
- Actions (run a macro to re-login, set headers, etc.)
- Conditions (run only if logged-out indicator detected)

Macros record a multi-step login flow (visit → fill form → submit
→ assert success). Burp re-runs the macro mid-scan when sessions
expire.

For CI/headless use, embed the configured session handling rules in
the project file - Burp re-loads them on `--project-file=...`.

## Step 6 - False-positive triage (MANDATORY)

Burp's three suppression mechanisms:

| Mechanism | Where | When to use |
|---|---|---|
| Issue suppression in scan config | Scan config: "Issue types to detect" | Categorical exclusion (e.g., disable SSL/TLS issues for staging-only HTTP) |
| Custom-issue rule (BCheck) | Project: BCheck definition | Per-project pattern (e.g., suppress findings on legacy admin endpoints) |
| Server-side mark-as-FP (Enterprise) | Enterprise dashboard | Persistent + auditable |
| Pro: per-issue notes | Right-click issue → Add note | In-tool only; no audit trail |

**Justification template (mandatory in BCheck or Enterprise notes):**

```
# BCheck: suppress SQL injection finding on /search?q=
# Reason: parameter pre-validated via Joi schema (line 42)
# Reviewer: alice@example.com (2026-05-15)
# Expires: 2026-12-15
# Re-review-date: 2026-12-15

given response.body matches "alice|bob|charlie"
then
    suppress
```

Cadence: Enterprise dashboard's "Resolved as False Positive" filter
periodically; review for staleness. Pro requires manual notes audit.

## Step 7 - Output formats

Burp Pro export: Issue → Right-click → Report selected issues →
HTML / XML / CSV / Burp's own JSON.

Burp Enterprise REST API returns issues as JSON natively; ingest
into [`dast-finding-triager`](../../agents/dast-finding-triager.md)
for combined Burp + ZAP + NightVision verdict.

For SARIF (GitHub Code Scanning): use the `BurpToSarif` community
converter (BApp Store).

## Step 8 - CI integration (Enterprise model)

```yaml
jobs:
  burp-enterprise:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Burp Enterprise scan
        run: |
          SCAN_ID=$(curl -s -X POST "${{ secrets.BURP_ENT_URL }}/api/scans" \
            -H "Authorization: ${{ secrets.BURP_ENT_TOKEN }}" \
            -d '{"site_id":42,"scan_configuration_id":7}' \
            | jq -r '.id')
          echo "SCAN_ID=$SCAN_ID" >> $GITHUB_ENV
      - name: Wait for scan completion
        run: |
          while true; do
            STATUS=$(curl -s "${{ secrets.BURP_ENT_URL }}/api/scans/$SCAN_ID" \
              -H "Authorization: ${{ secrets.BURP_ENT_TOKEN }}" | jq -r '.status')
            [ "$STATUS" = "succeeded" ] && break
            [ "$STATUS" = "failed" ] && exit 1
            sleep 30
          done
      - name: Download issues
        run: curl -s "${{ secrets.BURP_ENT_URL }}/api/scans/$SCAN_ID/issues" \
            -H "Authorization: ${{ secrets.BURP_ENT_TOKEN }}" -o burp-issues.json
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Burp Pro headless in CI without checking license | License violation; legal risk | Verify Pro license terms; use Enterprise for CI |
| Suppress per-issue note in Pro (no audit trail) | Notes lost in repo migrations | Use BCheck rules (committed to repo) or Enterprise mark-as-FP |
| Skip session handling for authenticated apps | Scanner gets stuck on login; coverage 0% | Configure session handling rules + macro (Step 5) |
| Run Burp scan against production | Active probes corrupt data | Staging only |
| BApp Store extensions without security review | Supply-chain risk | Enterprise extension allowlist |

## Limitations

- Burp Pro is per-user desktop tooling - headless / CI use has
  licensing constraints; Enterprise is the CI fit.
- Burp Enterprise requires dedicated server infrastructure +
  database; non-trivial ops cost.
- BApp Store extensions vary in quality; some are abandoned.
- REST API surface is stable but version-specific; consult
  in-tool API docs.
- Per [burp-as][burp-as], the comparison page differentiates Pro
  vs Enterprise - verify which edition fits your team's needs
  before procurement.

## References

- [burp-as][burp-as] - automated scanning overview
- portswigger.net/burp/documentation - Pro + Enterprise docs
- portswigger.net/burp/documentation/enterprise - Enterprise CI
- portswigger.net/bappstore - BApp Store
- [`zap-baseline`](../zap-baseline/SKILL.md),
  [`nightvision-dast`](../nightvision-dast/SKILL.md) - sister DAST tools
  (use ZAP first; Burp adds layered paid coverage)
- [`dast-baseline-runner`](../dast-baseline-runner/SKILL.md) - 
  build-an-X for layered DAST
- [`dast-finding-triager`](../../agents/dast-finding-triager.md) - 
  unifier agent
