---
name: qa-vendor-evaluator
description: "Build-an-X workflow that produces a side-by-side **commercial-vendor** evaluation matrix for QA tools - test-management platforms (TestRail / Qase / Xray / Zephyr / TestCollab), no-code platforms (mabl / Testim / Functionize / TestSigma / Reflect), visual regression services (Applitools / Percy / Chromatic), and commercial AI copilots - scoring each on capability fit, cost model, integration depth, vendor lock-in risk, exit cost, contractual posture, and customer-reference data. Scoped to commercial procurement - contract, lock-in, and exit-cost axes - not to choosing an open-source code-first framework on architectural fit. Use for commercial procurement decisions only - refuses to recommend a winner; the team owns the procurement choice."
---

# qa-vendor-evaluator

## Overview

QA managers procure commercial tools every 12 - 24 months: a new test-management platform, a no-code automation vendor, a visual-regression service, an AI copilot tier. The Capgemini [World Quality Report 2025-26](https://www.capgemini.com/insights/research-library/world-quality-report-2025-26/) identifies **integration friction (37% of teams)** as the dominant blocker for AI-in-testing adoption - the proximate failure mode is teams that adopted a vendor without scoring integration cost in advance. This skill produces the structured side-by-side comparison the manager carries into the procurement decision, with every score citing its source.

This is **decision-support, not recommendation**. The skill refuses to pick a winner - the team owns the procurement choice. The output is the evidence pack: capability matrix, cost-model breakdown, integration / lock-in / exit-cost analysis, and contractual posture per vendor. The manager (or a procurement-committee) makes the call against the team's NFR priorities.

## When to use

- A 12 - 24 month procurement cycle is approaching for a commercial QA tool.
- The team is evaluating a switch from one vendor to another (mid-contract renewal, post-acquisition consolidation).
- A new tool category is being adopted (the team has no incumbent - e.g., first visual-regression service).
- A vendor is being added to a multi-vendor stack and the team wants to ensure no overlap with incumbents.
- An RFP / RFI / procurement-committee process needs a structured evaluation artifact.

Do **not** use this skill when:

- The decision is between **open-source code-first frameworks** (Playwright vs Cypress vs Selenium) - use [`framework-choice-advisor`](../framework-choice-advisor/SKILL.md). Different axis entirely (architecture, not procurement; no contract, lock-in, or exit-cost dimensions).
- Only one vendor is being evaluated - comparison requires ≥2 candidates. (For a single-vendor go/no-go, use the team's standard procurement checklist; this skill needs comparison anchors.)
- The team has no defined NFR priorities - the matrix cannot score "capability fit" without knowing what the team needs the tool to do.

## Step 1 - Capture the inputs

Required:

| Input | Notes |
|---|---|
| **≥2 vendor candidates** | The vendors being compared. Halts on 1; recommends ≥3 for a healthy comparison (avoids the two-choice false-binary). |
| **Team profile** | Team size, existing stack (CI, test framework, observability, tracker), seat / volume profile, geography, regulated-industry flag (if any). |
| **NFR priorities** | Ordered list of what the team needs most: capability fit / cost / integration / lock-in / contract / support / data-residency. The order matters - the matrix's weighted score depends on it. |
| **Time horizon** | 12 / 24 / 36 month decision window. Drives the lock-in and exit-cost scoring (longer horizon = more weight on lock-in). |
| **Per-vendor data** | Pricing page, feature page, integration docs, customer-reference reviews (Gartner Peer Insights, G2, Capterra), vendor-published case studies (tagged as vendor-data). |

The skill halts with `INSUFFICIENT_INPUT` if any required input is missing.

## Step 2 - Score on the seven procurement axes

Per the canonical commercial-procurement framework, seven axes drive the decision. The skill scores each vendor on each axis, with **every score citing its source**.

### Axis A1 - Capability fit

How well does the vendor's feature set match the team's documented NFR priorities?

| Sub-axis | Scoring rubric (per-vendor) |
|---|---|
| Core feature coverage | % of team's required features present (cite the team's requirement list) |
| Advanced / aspirational features | Features the team doesn't need today but might in 2 years |
| Documented limits | Per-account / per-test / per-user caps that may bind |

### Axis A2 - Cost model

How is the vendor priced and what does it cost at the team's scale?

| Sub-axis | Scoring rubric |
|---|---|
| Pricing model | Per-seat / per-test / per-execution / flat licence / hybrid |
| Cost at current team size | Year-1 cost, cited to vendor pricing page (vendor-data) |
| Cost at projected team size | Year-2 and year-3 projections; the team's growth plan drives this |
| Hidden costs | Add-ons (parallel execution, premium support, SSO, audit log, on-prem option) |
| Volume-discount commitments | Annual commits, multi-year discounts (cite to vendor sales channel) |

### Axis A3 - Integration depth with existing stack

Per the [Capgemini WQR 2025-26](https://www.capgemini.com/insights/research-library/world-quality-report-2025-26/) finding (37% blocked by integration friction), this axis is often under-weighted in procurement. The skill weights it explicitly.

| Sub-axis | Scoring rubric |
|---|---|
| CI integration | Native plugin? REST API? Webhook? CLI? Cite the integration doc URL per vendor |
| Tracker integration | Jira / Linear / GitHub Issues / Azure DevOps |
| Observability integration | Datadog / Grafana / New Relic / Sentry |
| Test-framework binding | Playwright / Cypress / Selenium / per-language |
| SSO / IAM | SAML / OIDC / SCIM provisioning |
| Reverse data flow | Can the team export raw test results? In what format? |

For each integration, score: native (1.0) / API-buildable (0.7) / community-plugin (0.5) / not available (0.0). Use the team's existing integration skills (`testrail-integration`, `xray-integration`, `zephyr-integration`, `currents-integration`) as the per-vendor baseline.

### Axis A4 - Vendor lock-in risk

The cost of being unable to leave.

| Sub-axis | Scoring rubric |
|---|---|
| Proprietary data formats | Are tests in a portable format (Gherkin / standard JSON / open spec) or vendor-proprietary DSL? |
| Test artifact portability | Can the team export tests, results, history? In what format? Vendor-published export tools count toward portability. |
| Data residency | Where is data stored? Can the team request export and deletion? |
| Migration path | Are there documented or community-tested migration paths off this vendor (mabl → Playwright, Testim → Cypress)? |

### Axis A5 - Exit cost

The team has decided to leave in 24 months - what does it cost?

| Sub-axis | Scoring rubric |
|---|---|
| Test re-authoring effort | If tests are vendor-DSL-bound, the migration is "rewrite from scratch." If tests are portable (Gherkin, standard fixtures), migration is mostly mechanical. |
| History portability | Can the team take its test-result history? Defect-history correlation depends on this. |
| Re-training | How long to retrain the team on the new vendor? |
| Data egress fees | Some vendors charge for bulk data export. Cite the contract clause if applicable. |
| Contract early-termination cost | Multi-year commits often have early-termination fees. |

### Axis A6 - Contractual posture

Procurement / legal / security review needs structured data.

| Sub-axis | Scoring rubric |
|---|---|
| SLA tier | Uptime guarantee, support response time, escalation paths |
| Support tier | Email-only / chat / phone / dedicated CSM |
| Security audit availability | SOC 2 Type II report? ISO 27001? Penetration-test results? |
| On-prem / private-cloud option | For regulated industries; cite the vendor's deployment options page |
| Data-processing agreement | GDPR-compliant DPA available? HIPAA BAA? |
| Sub-processor disclosure | Vendor's sub-processor list (the regulated-industry view) |

### Axis A7 - Customer-reference data

Independent (not vendor-published) signal.

| Sub-axis | Scoring rubric |
|---|---|
| Gartner Peer Insights | Rating, review density, recency. Cite the category report URL. |
| G2 / Capterra | Rating, review density. Flag if reviews are sparse or stale (<10 reviews in last 12 months). |
| Practitioner blog / conference signal | Has the vendor been written about by recognised practitioners (Lisa Crispin, James Whittaker, etc.)? Cite the source. |
| Reddit / r/QualityAssurance / Hacker News | Anecdotal community signal - tag as such. Don't weight equally with surveyed data. |

## Step 3 - Emit the comparison matrix

Output is a single markdown document with a per-axis matrix plus an evidence appendix:

```markdown
# Vendor evaluation - `<category>` - `<team>` - 2026-07

## Vendors compared

| Code | Vendor | Pricing page | Cited integration doc |
|---|---|---|---|
| V1 | TestRail (Gurock / Idera) | https://www.testrail.com/pricing/ | https://support.testrail.com/hc/en-us/articles/7077873061908 |
| V2 | Qase | https://qase.io/pricing/ | https://help.qase.io/en/articles/5563000 |
| V3 | Xray (Xpand IT, for Jira) | https://www.getxray.app/pricing | https://docs.getxray.app/display/XRAYCLOUD/REST+API |

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
| TestRail | $7,488 (12 × $52/seat/mo × 12) | $11,232 | SSO add-on $480/yr/site; audit log enterprise-tier only |
| Qase | $4,320 (12 × $30/seat/mo × 12) | $6,480 | None at this tier; SSO included from Business plan |
| Xray | $6,840 (12 × $5/user/mo × 12) | $11,160 | Requires Jira Software seats - additional ~$8/user/mo if not already licensed |

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

## Step 4 - Hand off to procurement / decision committee

The matrix is the **input** to the decision, not the decision itself. Downstream:

1. **Vendor sales call** to re-verify pricing, SLA, and roadmap claims.
2. **Customer reference call** to 2 - 3 named customers per finalist.
3. **Security review** of SOC 2 / ISO 27001 reports.
4. **Pilot / POC** on the top-2 candidates (typically 30 - 60 day evaluation).
5. **Procurement-committee decision** with the matrix as the structured evidence pack.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Scoring "capability fit" without the team's NFR priorities | The matrix favours feature-richest vendor regardless of fit | Step 1 NFR priorities are mandatory inputs |
| Equal-weight matrix | Treats integration, cost, and capability as equally important - almost never true | Step 3 weighted score per team's NFR order |
| Picking the vendor by gut from the matrix | Per the [Capgemini WQR](https://www.capgemini.com/insights/research-library/world-quality-report-2025-26/), integration cost is under-weighted; gut decisions favour capability over integration | The weighted-score column is the discipline; the team must justify deviations |
| Skipping A4 / A5 (lock-in / exit cost) because "we'll figure it out later" | The dominant cost surfaces at year-2+; skipping these axes optimises for year-1 happiness | These axes are mandatory in the matrix |
| Treating vendor-data and Gartner / G2 data identically | Vendor-data is marketing; reviewed data is signal | A7 explicitly separates them |
| Using the matrix as the procurement decision | Procurement requires sales / reference / security calls beyond the matrix | Step 4 hand-off lists the required downstream actions |
| Comparing only 2 vendors | Two-choice procurement is a false binary; the team often missed a third option | Step 1 recommends ≥3 candidates |
| Skipping the weighted score because "it feels mechanical" | Without weighting, the matrix is decoration | Step 3 weighted score is required |
| Auto-recommending the highest-scored vendor | The team's context (existing relationship, hire-ability, contract leverage) is outside the matrix; auto-recommend strips that context | The "What this skill did NOT do" block explicitly disclaims the recommendation |

## Limitations

- **Vendor-data dominates the matrix.** Pricing pages, feature lists, and case studies are vendor-published. The skill flags these explicitly; the team verifies in sales calls.
- **Customer-reference scoring is shallow.** Public-review averages (Gartner, G2) are noisy. Real customer calls are the high-signal version; the matrix supplements but doesn't replace.
- **Categories drift fast.** A 2026 evaluation is stale by 2028; product features, pricing, and vendor stability all change. Re-run before each renewal cycle.
- **No competitive-dynamics axis.** The matrix doesn't account for vendor M&A risk (TestRail's parent Idera, mabl's growth stage, etc.). Add as an A8 if the team's horizon is >24 months.
- **Local market variation.** Pricing and contract terms differ by geography; the matrix uses US-list pricing unless the team specifies otherwise.
- **No regulatory-specific guidance.** Regulated-industry teams (healthcare, finance, automotive) have additional contractual axes (BAA, HIPAA, FDA Class II evidence) the skill doesn't enumerate per industry. Layer those onto A6.
- **Honest about being a draft.** The matrix is the manager's starting point; the procurement committee customises weights, adds axes, and replaces data after the sales / reference / security calls.

## Hand-off targets

- **Open-source framework selection (different decision)** → [`framework-choice-advisor`](../framework-choice-advisor/SKILL.md).
- **Per-vendor integration playbooks after the vendor is picked** → `testrail-integration`, `xray-integration`, `zephyr-integration`, `currents-integration`.
- **Vendor evaluation feeding a quarterly OKR (e.g., "adopt vendor X by Q3")** → [`qa-okr-author`](../qa-okr-author/SKILL.md).
- **Compliance vendor evaluation (regulated industries)** → augment the matrix with the `qa-compliance` plugin's per-framework reference skills.

## References

- Capgemini World Quality Report 2025-26 - 37% of teams cite integration friction as the dominant AI-in-testing blocker; load-bearing for axis A3: https://www.capgemini.com/insights/research-library/world-quality-report-2025-26/
- Gartner Peer Insights - AI-augmented software testing category: https://www.gartner.com/reviews/market/ai-augmented-software-testing-tools
- G2 / Capterra - methodology disclosure for review-density and recency scoring (general SaaS evaluation context; not QA-specific): https://www.g2.com/about
- ISTQB glossary - test automation framework (the open-source / commercial boundary): https://glossary.istqb.org/en_US/term/test-automation-framework
- ISTQB glossary - supplier (the procurement-side term for vendor): https://glossary.istqb.org/en_US/term/supplier
- ISO/IEC 25010 - quality model for non-functional requirements (used in A1 capability scoring): https://en.wikipedia.org/wiki/ISO/IEC_25010
- [`framework-choice-advisor`](../framework-choice-advisor/SKILL.md) - sibling reference for open-source framework selection; this skill is its commercial-procurement complement.
- `testrail-integration`, `xray-integration`, `zephyr-integration`, `currents-integration` - per-vendor integration baselines that feed A3.
- [`qa-okr-author`](../qa-okr-author/SKILL.md) - when the procurement outcome ladders into a quarterly OKR.
