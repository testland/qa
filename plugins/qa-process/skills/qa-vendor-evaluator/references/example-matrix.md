# Worked example - vendor comparison matrix

Deep reference for the `qa-vendor-evaluator` SKILL.md, Step 3. The full comparison document the skill emits: per-axis matrix, weighted score, the explicit "What this skill did NOT do" disclaimer, and the evidence appendix. Values are illustrative.

```markdown
# Vendor evaluation - `<category>` - `<team>` - 2026-07

## Vendors compared

| Code | Vendor | Pricing page | Cited integration doc |
|---|---|---|---|
| V1 | TestRail (Gurock / Idera) | https://www.testrail.com/pricing/ | https://support.testrail.com/hc/en-us/articles/7077873061908 |
| V2 | Qase | https://www.qase.io/pricing/ | https://docs.qase.io/en/articles/6417206-github |
| V3 | Xray (Xpand IT, for Jira) | https://marketplace.atlassian.com/apps/1211769/xray-test-management-for-jira | https://docs.getxray.app/display/XRAYCLOUD/REST+API |

## Team profile

- Size: 12 QA engineers
- Stack: Playwright + Jest, GitHub Actions, Linear (tracker), Datadog (observability)
- Geography: distributed US + EU; data-residency: EU required
- Regulated-industry: no
- Time horizon: 24 months

## NFR priorities (manager-supplied, ordered)

1. Integration with Linear + GitHub Actions
2. Cost at year-2 (team will grow to 18 engineers)
3. Data residency (EU)
4. Test-history portability (exit-cost matters; 24-month horizon)
5. SSO (SAML / OIDC)
6. Capability fit
7. Customer-reference depth

## Per-axis matrix

### A1 - Capability fit

| Vendor | Score (0-1.0) | Strengths | Gaps |
|---|---|---|---|
| TestRail | 0.85 | Mature test-case management, custom fields, bulk import / export | API rate limits documented at 180/min - may bind at scale |
| Qase | 0.80 | Modern UI, AI-assisted case authoring | Smaller plugin ecosystem |
| Xray | 0.95 | Deep Jira integration, BDD-native | Heavyweight Jira dependency the team doesn't have |

### A2 - Cost model

| Vendor | Year-1 (12 eng) | Year-2 (18 eng) | Hidden costs |
|---|---|---|---|
| TestRail | $5,328 (12 × $37/seat/mo Professional × 12) | $7,992 | SSO, automated backups, priority support are Enterprise-tier only |
| Qase | $4,320 (12 × $30/seat/mo Business × 12) | $6,480 | None at this tier; SSO included from Business plan |
| Xray | Quote from the Marketplace listing - Xray licenses by total Jira user tier, not by tester seat | Same tier rule at 18 engineers; re-quote if the Jira tier changes | Requires Jira Software seats if not already licensed |

### A3 - Integration depth

| Vendor | CI (GitHub Actions) | Tracker (Linear) | Observability (Datadog) | Test-framework (Playwright) | SSO |
|---|---|---|---|---|---|
| TestRail | Native (1.0) | API-buildable (0.7) | Community plugin (0.5) | API + `testrail-cli` (0.9) | SAML / OIDC (1.0) |
| Qase | Native action (1.0) | Native (1.0) | Webhook (0.7) | Native @qase/playwright (1.0) | SAML (Business+) (0.8) |
| Xray | API only (0.7) | API-buildable (0.7) | None native (0.0) | xray-junit-extensions (0.9) | SAML / OIDC (1.0) |

### A4 - Vendor lock-in risk

| Vendor | Format | Export | Lock-in score |
|---|---|---|---|
| TestRail | Proprietary case format; bulk CSV export | Documented CSV / XML export, JSON via API | Moderate (0.6) - export possible, but tests need re-authoring on migration |
| Qase | YAML / JSON case format; native import / export | First-class export to JSON / YAML | Low (0.85) - portable artifacts |
| Xray | BDD-native (Gherkin), JUnit / Cucumber export | Tied to Jira issue model; export possible but harder to disentangle | Moderate-high (0.5) - Jira coupling is the lock-in axis |

### A5 - Exit cost (24-month migration scenario)

| Vendor | Test re-authoring | History portability | Total exit cost (hand-wave) |
|---|---|---|---|
| TestRail | Cases portable as CSV; ~30% needs re-authoring for new tool | History exportable via API | ~3 person-months |
| Qase | YAML / Gherkin cases mostly portable; ~10% re-authoring | Native export | ~1 person-month |
| Xray | Gherkin scenarios portable; Jira-issue history harder to extract | API export; needs custom tooling | ~4 person-months |

### A6 - Contractual posture

| Vendor | SLA | Support | Security | EU residency |
|---|---|---|---|---|
| TestRail | 99.9% (Cloud), no SLA for self-hosted | Email; phone on Enterprise | SOC 2 Type II + ISO 27001 (cite vendor security page) | EU AWS region available on Enterprise |
| Qase | 99.9% on Business+ | Email + chat; CSM on Enterprise | SOC 2 Type II (cite) | EU region available on Business |
| Xray | Bound to Jira's SLA | Email + chat | SOC 2 Type II inherited from Xpand IT | Tied to Jira region |

### A7 - Customer-reference data

| Vendor | Gartner Peer Insights | G2 (recency / density) | Practitioner-signal |
|---|---|---|---|
| TestRail | 4.4/5 (382 reviews, mostly 2023-25) | 4.2/5, 250+ reviews | Cited in Lisa Crispin's *Agile Testing Condensed* |
| Qase | 4.6/5 (180 reviews, 2024-26) | 4.7/5, 120+ reviews | Featured in TestBash 2025 case studies |
| Xray | 4.4/5 (290 reviews) | 4.4/5, 200+ reviews | Heavy enterprise adoption signal; lighter mid-market |

## Weighted score per NFR priorities

| Axis | Weight (per team NFR order) | TestRail | Qase | Xray |
|---|---|---|---|---|
| A3 Integration | 0.25 | 0.78 | 0.92 | 0.62 |
| A2 Cost | 0.20 | 0.65 | 0.95 | 0.70 |
| A6 EU residency | 0.15 | 0.80 | 0.90 | 0.70 |
| A5 Exit cost | 0.15 | 0.60 | 0.90 | 0.50 |
| A6 SSO | 0.10 | 1.00 | 0.80 | 1.00 |
| A1 Capability fit | 0.10 | 0.85 | 0.80 | 0.95 |
| A7 Customer-reference | 0.05 | 0.90 | 0.85 | 0.85 |
| **Total** | **1.00** | **0.76** | **0.89** | **0.69** |

## What this skill did NOT do

- Pick the winner. The matrix and weighted scores are the input to the procurement decision; the team owns the choice. The team may legitimately pick the lower-scored vendor for reasons outside the matrix (existing relationship, hiring-pool, founder preference).
- Negotiate the contract. Once a vendor is picked, contract terms (discount, multi-year commit, SLA tier) are a separate procurement conversation.
- Validate vendor claims. Where the matrix cites vendor-data (pricing, feature lists, case studies), the data is vendor-published and should be re-verified in a sales call before commitment.
- Replace a reference call. Customer references should be called directly, not just scored from public-review averages.

## Evidence appendix

Every cell in the matrix above traces to a source URL or cited document. The full appendix lists every source (per axis × per vendor) so the team can spot-check.
```
