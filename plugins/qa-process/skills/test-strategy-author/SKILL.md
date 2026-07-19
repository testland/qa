---
name: test-strategy-author
description: "Build-an-X workflow that produces a test strategy document for a project / release / feature - covers scope, in/out, test types per layer (unit / integration / contract / E2E / perf / security / a11y), risk-based prioritization mapping (per `risk-matrix`), tooling stack, environments, exit criteria, ownership. Use as the artifact stakeholders sign off on before significant test investment, and the reference engineering teams come back to when scope / quality questions arise."
---

# test-strategy-author

## Overview

A test strategy document answers the question "how do we know
we're testing the right things?" Without it, test investment is
gut-feel; with it, the team has a defensible artifact tying test
work to risk and business goals.

This skill produces the document.

## When to use

- A new product / large feature is in planning; the team needs to
  scope test investment.
- A multi-quarter initiative needs a published strategy stakeholders
  can review.
- An audit / compliance review requires a documented strategy.
- A new team forming around a product needs onboarding context.

For per-feature test plans (smaller scope), use the lighter-weight
[`risk-matrix`](../risk-matrix/SKILL.md) - strategy is for
larger horizons.

## Step 1 - Document structure

```markdown
# Test Strategy - `<product / release>`

**Author:** _______________   **Date:** YYYY-MM-DD
**Status:** Draft | Review | Approved
**Stakeholders:** Engineering, Product, QA, Compliance

## 1. Scope

### In scope
- (List of features / surfaces this strategy covers)

### Out of scope
- (Explicit list of what's NOT covered, with rationale)

### Assumptions
- (List of context the strategy depends on)

## 2. Risk basis

(Reference the risk matrix per [`risk-matrix`](../risk-matrix/SKILL.md))

| Risk class | Top risks (from matrix) | Test investment |
|------------|-------------------------|-----------------|
| Business    | Promo math, Tax calculations | Property-based + UAT |
| Technical   | Webhook reliability, DB migrations | Chaos + integration |
| Regulatory  | EU GDPR, CCPA          | UAT + privacy review |
| Performance | Checkout latency        | Load + canary       |

## 3. Test types per layer (the pyramid)

Per the test pyramid ([`test-pyramid-balancer`](../test-pyramid-balancer/SKILL.md)):

| Layer       | Coverage target | Tools | Owner |
|-------------|----------------:|-------|-------|
| Unit         |       80%       | Jest, pytest, JUnit | Devs |
| Integration  |       60%       | Testcontainers, supertest | Devs |
| Contract     |       100% of consumer-provider pairs | Pact | Devs |
| E2E          |       Critical paths (5-10 flows) | Playwright | QA |
| Performance  |       Critical endpoints | k6 + Lighthouse CI | QA + SRE |
| Security     |       OWASP Top 10 | Schemathesis + manual pen test | Security |
| A11y         |       WCAG 2.2 AA | axe + manual review | QA |

## 4. Tooling

(Stack inventory per layer; references to specific skills)

## 5. Environments

- **Local dev** - per-engineer; Testcontainers backing services.
- **Staging** - shared; smoke + UAT.
- **Canary** - 5% prod traffic; 30-min observation per
  prod-canary-validator.
- **Prod** - synthetic monitors per
  synthetic-monitor-author.

## 6. Test data

- **Synthetic accounts** - per synthetic-data-toolkit.
- **PII handling** - per synthetic-pii-generator.
- **Database state** - per database snapshot / restore.

## 7. Exit criteria

Release ships when:

- All AC for in-scope features pass.
- All unit/integration tests green; no flake in last 3 main runs.
- E2E critical-path suite green.
- Coverage targets met per Section 3.
- Performance targets met (p95 within budget).
- A11y regression scan green.
- Threat model reviewed for security-touching changes.
- Risk matrix Critical (>=15) all mitigated.

## 8. Ownership

| Activity              | Owner | Backup |
|-----------------------|-------|--------|
| Unit test reviews      | Devs  | Tech lead |
| E2E suite maintenance  | QA    | Dev TPM |
| Perf budget approval   | SRE   | QA |
| Threat model authorship | Security | Dev TPM |
| Synthetic monitors     | SRE   | QA |
| Risk matrix updates    | QA    | Product |

## 9. Cadence

- **Per-PR:** Lint, unit, integration, smoke E2E, coverage delta.
- **Per-merge to main:** Full E2E, perf gate.
- **Nightly:** Full regression, mutation testing weekly.
- **Pre-release:** Manual UAT sign-off, full security scan,
  release-readiness check.

## 10. Risk register snapshot

(Top 10 risks from the matrix as of strategy authoring date)

## 11. Open questions / decisions needed

- (List of unresolved items requiring stakeholder input)

## Approval

- [ ] Engineering manager
- [ ] QA lead
- [ ] Product manager
- [ ] Security (if applicable)
```

## Step 2 - Tailor per project size

| Project size | Strategy length | Scope    |
|--------------|----------------:|----------|
| Small (1-3 mo) | 2-3 pages    | Sections 1-3 + 7 |
| Medium (1-2 quarters) | 5-7 pages | All sections |
| Large (multi-quarter) | 10+ pages | All + sub-strategies per major feature |

## Step 3 - Review cadence

| Trigger                                          | Action                                           |
|--------------------------------------------------|--------------------------------------------------|
| Quarterly                                         | Re-review; update sections 2 (risks), 7 (exit), 10 (snapshot). |
| Major architectural change                        | Re-author Sections 3 + 6.                         |
| Post-incident                                     | Update Section 2 (new risks); Section 7 (new exit criterion). |
| New compliance requirement                        | Section 1 + Section 7.                            |

## Step 4 - Reference patterns

Common strategy patterns by product type:

| Product type         | Strategy emphasis                                       |
|----------------------|---------------------------------------------------------|
| E-commerce            | Business risks (promo math, currency, tax); UAT-heavy. |
| SaaS B2B               | Security + multi-tenancy; contract testing critical.  |
| Mobile native          | Per-platform matrix; manual tier; performance.        |
| Internal tooling       | Light strategy; integration over E2E.                  |
| Regulated (fintech, health) | Heavyweight RBT (FMEA); auditable trail.            |

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Generic strategy template not tailored to product                     | Reads like boilerplate; nobody references.                               | Tailor per Section 1 (scope) and Section 4 (tooling). |
| Strategy authored once; never reviewed                                | Becomes obsolete; team distrusts.                                        | Quarterly cadence (Step 3). |
| No exit criteria                                                       | "Done" is subjective; release decisions arbitrary.                       | Section 7 - explicit + measurable. |
| Strategy = test plan                                                   | Strategy is high-level; per-feature plans are detailed (different artifact). | Use [`risk-matrix`](../risk-matrix/SKILL.md) for per-feature. |
| Owner column missing                                                   | Activities slip; "everyone owns it = nobody."                            | Section 8 explicit owners. |
| Strategy in slides, not version-controlled                             | History lost; updates invisible.                                          | Markdown + git. |

## Limitations

- **Strategy ≠ execution.** A great strategy doesn't ensure great
  testing - pair with per-feature plans + per-PR enforcement.
- **Quarterly cadence is a floor.** Fast-moving products may need
  more frequent revisits.
- **Stakeholder buy-in required.** A strategy nobody read is
  paperwork; circulate, present, get sign-off.

## References

- [`risk-matrix`](../risk-matrix/SKILL.md) - feeds Section 2.
- [`test-pyramid-balancer`](../test-pyramid-balancer/SKILL.md) - 
  feeds Section 3.
- [`definition-of-done`](../definition-of-done/SKILL.md) - feeds
  Section 7.
