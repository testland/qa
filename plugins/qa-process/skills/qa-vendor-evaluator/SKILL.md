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

- The decision is between **open-source code-first frameworks** (Playwright vs Cypress vs Selenium) - use `framework-choice-advisor`. Different axis entirely (architecture, not procurement; no contract, lock-in, or exit-cost dimensions).
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

Per the canonical commercial-procurement framework, seven axes drive the decision. Score each vendor on each axis, with **every score citing its source**:

- **A1 Capability fit** - feature coverage vs the team's NFR list, plus documented limits.
- **A2 Cost model** - pricing model, year-1/2/3 cost at the team's scale, hidden costs.
- **A3 Integration depth** - CI, tracker, observability, test-framework, SSO, reverse data flow; often under-weighted despite integration friction blocking 37% of teams ([Capgemini WQR 2025-26](https://www.capgemini.com/insights/research-library/world-quality-report-2025-26/)). Score each integration native (1.0) / API-buildable (0.7) / community-plugin (0.5) / not available (0.0).
- **A4 Lock-in risk** - format portability, artifact export, data residency, migration path.
- **A5 Exit cost** - test re-authoring, history portability, re-training, egress fees, early-termination.
- **A6 Contractual posture** - SLA, support, security audits, on-prem, DPA/BAA, sub-processors.
- **A7 Customer-reference data** - Gartner / G2 ratings, practitioner signal, community anecdote (tagged, not equal-weighted with surveyed data).

The full per-sub-axis rubric for all seven axes is in [references/scoring-rubric.md](references/scoring-rubric.md).

## Step 3 - Emit the comparison matrix

Emit a single markdown document: the vendors compared, the team profile, the ordered NFR priorities, a per-axis matrix (A1-A7), a weighted-score table using the NFR order as weights, an explicit "What this skill did NOT do" disclaimer (does not pick the winner, negotiate, validate vendor claims, or replace a reference call), and an evidence appendix tracing every cell to a source. The full worked comparison document is in [references/example-matrix.md](references/example-matrix.md).

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

- **Open-source framework selection (different decision)** → `framework-choice-advisor`.
- **Per-vendor integration playbooks after the vendor is picked** → `testrail-integration`, `xray-integration`, `zephyr-integration`, `currents-integration`.
- **Vendor evaluation feeding a quarterly OKR (e.g., "adopt vendor X by Q3")** → `qa-okr-author`.
- **Compliance vendor evaluation (regulated industries)** → augment the matrix with the `qa-compliance` plugin's per-framework reference skills.

## References

- Capgemini World Quality Report 2025-26 - 37% of teams cite integration friction as the dominant AI-in-testing blocker; load-bearing for axis A3: https://www.capgemini.com/insights/research-library/world-quality-report-2025-26/
- Gartner Peer Insights - AI-augmented software testing category: https://www.gartner.com/reviews/market/ai-augmented-software-testing-tools
- G2 / Capterra - methodology disclosure for review-density and recency scoring (general SaaS evaluation context; not QA-specific): https://www.g2.com/about
- ISTQB glossary - test automation framework (the open-source / commercial boundary): https://glossary.istqb.org/en_US/term/test-automation-framework
- ISO/IEC 25010 - quality model for non-functional requirements (used in A1 capability scoring): https://en.wikipedia.org/wiki/ISO/IEC_25010
- `framework-choice-advisor` - sibling reference for open-source framework selection; this skill is its commercial-procurement complement.
- `testrail-integration`, `xray-integration`, `zephyr-integration`, `currents-integration` - per-vendor integration baselines that feed A3.
- `qa-okr-author` - when the procurement outcome ladders into a quarterly OKR.
