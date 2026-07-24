---
name: product-risk-register-builder
description: "Build-an-X workflow that produces a product-level risk register catalogue - per-feature / per-component product risks (functionality, performance, security, usability, compatibility, reliability) that persist across releases, distinct from per-release risk matrices. Walks the author through risk identification by ISO 25010 quality characteristic, scoring per impact × likelihood, and linking each register entry to mitigations + owners + review cadence. Output is a Markdown register the team reviews quarterly and that seeds release-level risk matrices. Use for long-lived product-quality risks; complements risk-matrix for per-release risks."
---

# product-risk-register-builder

## Overview

The product risk register catalogs **long-lived product-quality
risks** - risks tied to the product's architecture, domain, and
user base that persist across releases. Distinct from the
per-release risk matrix
(`risk-matrix`) which captures
release-scoped risks. Both feed risk-based test selection and
planning.

Per ISTQB CTAL-TM syllabus chapter 5 on risk-based testing and
ISO 31000:2018 (risk management) - cite by stable ID; ISO behind
paywall.

## When to use

- Onboarding a new test lead - establish the product-quality risk
  baseline.
- Quarterly product-quality review - re-score persistent risks.
- Compliance audit - document long-lived product risks beyond the
  current release.
- Seeding a new release's
  `risk-matrix` - copy persistent risks
  forward, add release-specific ones.

## Step 1 - Identify risks by quality characteristic

Walk through ISO 25010 quality characteristics. For each, ask:
"What could go wrong here in this product?"

| Characteristic | Example product risks |
|---|---|
| **Functional suitability** | Core business logic incorrectness (pricing, tax, compliance calculations) |
| **Performance efficiency** | Sustained load failure; large-dataset slowness; cold-start latency |
| **Compatibility** | Browser / OS / device fragmentation; third-party API drift |
| **Usability** | Accessibility (WCAG conformance); learnability for new users; error messaging |
| **Reliability** | Recovery from upstream failures; data durability; transactional integrity |
| **Security** | Auth / authz; PII exposure; injection vulnerabilities; supply chain |
| **Maintainability** | Tech debt accumulating in critical paths; test brittleness |
| **Portability** | Migration between cloud providers; export/import data integrity |

Per ISO/IEC 25010:2023 quality model (cite by stable ID).

Aim for 15-30 product-level risks. Fewer than 10 = too sparse;
more than 50 = mix with per-release risks.

## Step 2 - Score per impact × likelihood

Use the same 1-5 scale as
`risk-matrix`. Score is `impact ×
likelihood`:

| Score | Tier | Action |
|---|---|---|
| 15-25 | Critical | Continuous monitoring + multiple mitigations + quarterly review |
| 10-14 | High | At least one strong mitigation + annual review |
| 5-9 | Medium | Documented mitigation strategy + biannual review |
| 1-4 | Low | Acknowledged; mitigation optional |

## Step 3 - Document the register

```markdown
# Product risk register - <product-name>

**Last reviewed:** YYYY-MM-DD  **Owner:** <name>  **Next review:** YYYY-MM-DD

## Active risks (n=22)

| ID | Category (ISO 25010) | Risk | Impact | Likelihood | Score | Mitigation(s) | Owner | Last review |
|---|---|---|---:|---:|---:|---|---|---|
| PR-001 | Functional suitability | Pricing engine off-by-cent in EU markets | 5 | 3 | 15 | Property-based testing on rounding; nightly compliance test suite | Alice | 2026-05-01 |
| PR-002 | Security | OAuth refresh-token leak via logs | 5 | 2 | 10 | Log redaction middleware; quarterly secret-scan; presidio-pii-detection in CI | Bob | 2026-04-15 |
| PR-003 | Reliability | Stripe webhook delivery failure not retried | 4 | 4 | 16 | DLQ + retry; chaos test in staging weekly | Carol | 2026-05-10 |
| PR-004 | Performance | Catalog search slows under >10k SKUs | 4 | 3 | 12 | Elasticsearch tuning; k6 load test gate | Dan | 2026-03-20 |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |

## Retired risks (n=5)

| ID | Risk | Retired date | Why retired |
|---|---|---|---|
| PR-R-001 | Legacy SOAP API maintenance | 2026-02-01 | API decommissioned in v3.0 |
| ... | ... | ... | ... |
```

## Step 4 - Link mitigations to test coverage

For each active risk, name at least one **mitigation** and link
it to existing test coverage (or flag a gap):

```markdown
| PR-001 | Pricing engine off-by-cent | 15 | Tests: tests/billing/test_promo_stacking.py + nightly compliance suite (PROJ-T123 + 124) | Alice |
```

Use `risk-coverage-mapper` to
generate the test↔risk map.

## Step 5 - Quarterly review

Per ISTQB CTAL-TM, product risks should be re-scored at least
quarterly:

```markdown
## Q2 2026 review log

- **PR-001**: Impact unchanged (5); likelihood **lowered 3 → 2**
  (property-based tests in place + 6 months no incidents). New
  score: 10 (was 15).
- **PR-003**: Impact unchanged (4); likelihood **raised 4 → 5**
  after Q1 webhook outage at provider. New score: 20 (was 16).
- **PR-007**: **Retired** - feature deprecated in v3.0.
- **New: PR-022**: Locale-related date formatting; impact 3,
  likelihood 3, score 9. Owner: Eve.

Net change: 1 new, 1 retired, 1 risen, 1 lowered. Total active: 22.
```

## Step 6 - Seed the release matrix

When a release matrix starts:

1. Copy product risks scoring ≥10 (High + Critical tier) into the
   release matrix.
2. Identify release-specific risks beyond the persistent ones
   (per the release's feature set).
3. Per
   `risk-matrix`, assign the
   release-specific testing strategy.

## Worked example - e-commerce product

A 24-risk register might decompose like:

| Category | Count | Avg score |
|---|---:|---:|
| Functional suitability | 6 | 13 |
| Performance | 3 | 11 |
| Security | 5 | 14 |
| Reliability | 4 | 12 |
| Compatibility | 3 | 9 |
| Usability | 2 | 8 |
| Maintainability | 1 | 6 |

Distribution suggests Security + Functional suitability are the
top areas to invest in.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| One-time creation, never reviewed | Register becomes stale | Quarterly review cadence |
| Mixing per-release risks into the product register | Confuses long-lived from transient | Per-release risks in `risk-matrix`; product-level here |
| No retired-risks section | History lost; "why did we stop testing X?" unanswered | Always keep a retired-risks log |
| Score without recent re-review | Stale scores misinform planning | "Last review" date column; auto-flag stale entries |
| Mitigation missing test coverage link | Mitigation is theoretical; no evidence it works | Always link mitigation → test (or flag as gap) |
| ISO 25010 categories unused | Risk list skewed to functional only | Walk all 8 characteristics |
| Risk register in a wiki page that nobody opens | Effectively shelf-ware | Versioned in repo; reviewed at sprint planning |

## Limitations

- **Subjective scoring.** Impact × likelihood depends on judgment;
  inter-rater agreement is moderate. Use the rubric anchors in
  `risk-matrix` Step 2.
- **Quarterly cadence is a floor.** Volatile products may need
  monthly; mature products may extend to annual.
- **Doesn't replace per-feature analysis.** Product risks are
  high-altitude; per-feature risk analysis happens at release.
- **Mitigation linkage is one-directional.** Test coverage may
  exceed risk mitigation (defensible: unconnected coverage isn't
  bad). Reverse - risks without coverage - needs explicit
  attention.

## References

- ISTQB Advanced Test Manager (CTAL-TM) syllabus, ch. 5 on
  risk-based testing.
- ISO 31000:2018 "Risk management - Guidelines" - cite by stable
  ID; iso.org paywall.
- ISO/IEC 25010:2023 "Systems and software engineering - Systems
  and software Quality Requirements and Evaluation (SQuaRE) - 
  Product quality model" - cite by stable ID.
- ISTQB Glossary - 
  [glossary.istqb.org](https://glossary.istqb.org/) - "product
  risk", "project risk", "risk identification".
- Composes:
  `risk-matrix` (release-scoped),
  `risk-coverage-mapper`.
- Sibling skill:
  `project-risk-register-builder` - different scope (project-level: schedule, env, people).
