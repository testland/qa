---
name: risk-matrix
description: "Produces the per-feature / per-release risk-matrix artifact (not the facilitation session - see `risk-storming-facilitator` for running the live meeting). Captures risks via a structured intake (feature, category, impact 1-5 by likelihood 1-5, score), tracks mitigations plus owners plus due dates, supports both lightweight (impact by likelihood) and heavyweight (FMEA / Cost of Exposure) methods per RBT canon. Output is a Markdown / spreadsheet artifact the team reviews per sprint and that drives test prioritization, consumed by `risk-based-test-selector` and `risk-based-test-planner`. Does not recommend which methodology to use: for data-driven score calibration against historical defect data use `risk-matrix-recommender`. For a cross-release living register of high-risk areas spanning services, use `product-risk-register-builder`. Use when building the per-release matrix artifact itself."
---

# risk-matrix

## Overview

Per [rbt-wiki][rbt]:

[rbt]: https://en.wikipedia.org/wiki/Risk-based_testing

> "**Risk-based testing (RBT)** is 'a type of software testing that
> functions as an organizational principle used to prioritize the
> tests of features and functions in software, based on the risk
> of failure.'"

The risk matrix is the artifact that drives RBT decisions. Without
it, prioritization is gut-feel; with it, the team has a
defensible record of "why we tested this and not that."

## When to use

- A new feature is in planning; the team needs to scope test effort.
- A release scope is set; the team needs to allocate manual + auto
  test time.
- Quarterly: the team wants to know which areas have the highest
  unmitigated risk.
- Audit / compliance: the team must show a documented risk
  assessment.

## Step 1 - Pick the methodology

Per [rbt-wiki][rbt], two approaches:

| Approach        | Method                                   | When |
|-----------------|------------------------------------------|------|
| **Lightweight** | Impact × Likelihood, simple high/medium/low | Default; most teams. |
| **Heavyweight** | FMEA / Cost of Exposure / QFD / FTA      | Regulated industries; safety-critical; insurance. |

Most teams should start lightweight - heavyweight methods need
specialized expertise.

## Step 2 - Lightweight matrix structure

```markdown
# Risk matrix - `<feature/release>`

**Date:** YYYY-MM-DD   **Owner:** _______________   **Reviewers:** _______________

## Risks

| ID  | Risk                                          | Category   | Impact (1-5) | Likelihood (1-5) | Score | Mitigation                          | Owner | Due |
|-----|-----------------------------------------------|------------|-------------:|-----------------:|------:|-------------------------------------|-------|-----|
| R-1 | Promo discount math wrong (off-by-cent)        | Business   |      5       |       3          |  15   | Add property-based tests on rounding | Alice | 2026-05-15 |
| R-2 | Stripe webhook delivery failure not retried    | Technical  |      4       |       4          |  16   | Add retry + DLQ; add chaos test     | Bob   | 2026-05-12 |
| R-3 | EU tax calculation incorrect                    | Regulatory |      5       |       2          |  10   | UAT with finance team               | Carol | 2026-05-20 |
| R-4 | Cart loses state on app restart                 | UX         |      3       |       3          |   9   | Persistent cart in localStorage     | Dave  | 2026-05-10 |

## Heatmap

| Likelihood ↓ \ Impact → | 1 (low) | 2 | 3 | 4 | 5 (high) |
|--------------------------|---------|---|---|---|----------|
| 5 (very likely)           |         |   |   |   |          |
| 4                          |         |   |   | R-2 |        |
| 3                          |         |   | R-4 |   | R-1     |
| 2                          |         |   |   |   | R-3     |
| 1                          |         |   |   |   |          |

## Verdict

- **Critical (score >=15):** R-1 (15), R-2 (16). Block release until mitigated.
- **High (score 9-14):** R-3 (10), R-4 (9). Mitigate this sprint.
- **Medium (score 5-8):** (none).
- **Low (score 1-4):** (none).
```

The 5×5 matrix yields scores 1-25; the team picks the threshold
for "block release" (typically 15+).

## Step 3 - Risk categories

Per [rbt-wiki][rbt], risks span:

> - **Business/operational**: System criticality and usage frequency
> - **Technical**: Team distribution and complexity
> - **External**: Regulatory requirements and stakeholder preferences
> - **E-business specific**: Security vulnerabilities, performance failures, and integration defects

Tag every risk with one category. Patterns emerge over time - 
"all our top risks are integration" suggests an architectural
review, not just more testing.

## Step 4 - Map risks to test types

A populated matrix drives the test plan:

| Risk class     | Recommended test types                                       |
|----------------|--------------------------------------------------------------|
| Business logic  | Unit + property-based + UAT                                  |
| Technical       | Integration + chaos + load                                    |
| Regulatory      | UAT with stakeholder + compliance review                      |
| UX              | Manual exploratory + visual regression                         |
| Security        | Threat model + SAST + DAST + pen test                         |
| Performance     | Load + perf budget + canary                                   |
| Integration     | Contract testing + integration tests + canary                 |

The test plan reads off the matrix: top-N risks → test types per
risk → estimated effort.

## Step 5 - Heavyweight: FMEA + Cost of Exposure

For regulated industries, lightweight scoring may not suffice.

### FMEA (Failure Mode and Effect Analysis)

Per row: **failure mode + effect + severity (1-10) + occurrence
(1-10) + detectability (1-10) → RPN (Risk Priority Number =
S × O × D, range 1-1000)**.

```markdown
| ID  | Failure mode                  | Effect                            | S  | O | D | RPN | Action |
|-----|--------------------------------|-----------------------------------|----|---|---|-----|--------|
| F-1 | Promo math wrong               | Wrong charge to customer           | 8  | 5 | 4 | 160 | property tests |
| F-2 | Stripe webhook missed          | Order not fulfilled                | 9  | 4 | 6 | 216 | retry + DLQ + monitor |
```

Detectability is the inverse of "tests would catch it" - 
high D = hard to catch = high RPN.

### Cost of Exposure

```markdown
Risk: Stripe webhook delivery failure
- Estimated incidents per year (untreated): 12
- Average revenue lost per incident: $5,000
- Annual cost of exposure: $60,000
- Cost of mitigation (retry + DLQ + monitor): $15,000 one-time + $2,000/year
- Decision: Mitigate (ROI in 3 months)
```

Per [rbt-wiki][rbt], these heavyweight methods quantify
"financial impact analysis" - useful for justifying test budget
to non-technical stakeholders.

## Step 6 - Cadence

| Cadence    | Trigger                                        |
|------------|------------------------------------------------|
| Per-feature | Before development starts                       |
| Per-release | Pre-release sign-off                            |
| Quarterly   | Strategic risk review                           |
| Post-incident | Update the matrix with the surfaced risk      |

The matrix is a **living document** - risks change as features
ship, mitigations land, and incidents reveal new failure modes.

## Step 7 - Format + storage

```
docs/risk-matrices/
├── 2026-Q2-checkout-redesign.md
├── 2026-Q2-stripe-integration.md
├── 2026-Q1-summary.md       ← rollup
└── README.md
```

Markdown files version-controlled in git. Reviews via PR; updates
tracked over time.

## Anti-patterns

| Anti-pattern                                                          | Why it fails                                                              | Fix |
|-----------------------------------------------------------------------|---------------------------------------------------------------------------|-----|
| Risk matrix authored once, never updated                              | Becomes irrelevant; team stops trusting.                                 | Per-feature + quarterly cadence (Step 6). |
| Subjective scoring without examples                                   | Different reviewers score differently; matrix unreliable.                | Document score rubric (e.g., "5 = customer money loss"). |
| All-business-category matrix                                           | Misses technical / regulatory risks; gaps invisible.                     | Tag every risk with a category (Step 3). |
| Matrix without owner per row                                           | "Mitigated" never happens.                                               | Owner column required (Step 2). |
| Heavyweight FMEA on a small product                                    | Over-engineering; team disables.                                         | Lightweight default; FMEA only when regulation requires (Step 1). |
| Risk matrix in slides, not version-controlled                          | History lost; rollup impossible.                                         | Markdown + git (Step 7). |

## Limitations

- **Subjective scoring.** Even with a rubric, team members weigh
  risks differently. Multiple-reviewer consensus helps.
- **Doesn't predict unknown unknowns.** RBT addresses identified
  risks; new failure modes emerge from incidents (and update the
  matrix).
- **Heavyweight methods need expertise.** FMEA is well-defined; QFD
  / FTA require specialized training.

## References

- [rbt][rbt] - Risk-based testing definition, lightweight vs
  heavyweight methods (FMEA, Cost of Exposure, QFD, FTA), risk
  categories (business / technical / external / e-business).
- [`risk-storming-facilitator`](../risk-storming-facilitator/SKILL.md) - sibling: facilitates the session that fills the matrix.
- [`risk-based-test-selector`](../../agents/risk-based-test-selector.md) - agent that consumes the matrix to pick test scope per change.
- [`risk-based-test-planner`](../../agents/risk-based-test-planner.md) - strategic planner using the matrix.
- [`test-strategy-author`](../test-strategy-author/SKILL.md) - 
  test strategy doc that references the matrix.
