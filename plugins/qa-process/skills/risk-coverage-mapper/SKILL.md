---
name: risk-coverage-mapper
description: "Build-an-X workflow that produces a risk-to-test-coverage matrix - maps each risk in the product/release register to the tests / cases / monitoring that mitigate it. Walks the author through ingesting risks (from risk-matrix / product-risk-register-builder), inventorying test coverage (test cases via traceability-matrix-builder, automated tests via repo scan, production monitoring via observability dashboards), and computing per-risk coverage depth + identifying orphan risks (no coverage) + orphan tests (not linked to risks). Output is a Markdown matrix + executive summary."
rating: 23
d6: 4
---

# risk-coverage-mapper

## Overview

A risk-coverage matrix proves "every meaningful risk has at least
one mitigation, and every mitigation traces to a test or monitor
that exercises it." It's the natural complement to the
requirements-to-tests traceability matrix
([`traceability-matrix-builder`](../../../qa-test-management/skills/traceability-matrix-builder/SKILL.md)) - 
which proves "every requirement has a test." Where requirements
say *what to build*, risks say *what could go wrong*, and each
needs its own coverage view.

Per ISTQB CTAL-TM ch. 5 on risk-based test prioritisation (cite
by stable ID).

## When to use

- Pre-release risk review - confirm critical risks are covered.
- Audit / compliance - defensible "we tested for risk X" trail.
- Sprint retrospective - find risks accumulating coverage debt.
- Onboarding - see at a glance which risks the test suite addresses.

## Step 1 - Ingest the risk register

From the relevant register(s):

- [`risk-matrix`](../risk-matrix/SKILL.md) (per-release)
- [`product-risk-register-builder`](../product-risk-register-builder/SKILL.md) (long-lived product)
- [`project-risk-register-builder`](../project-risk-register-builder/SKILL.md) (project execution - typically excluded from this matrix; only product / release risks map to *test* coverage)

```python
def load_risks():
    risks = []
    risks.extend(load_matrix("release-Q2-risks.md"))
    risks.extend(load_product_register("product-risks.md"))
    return [r for r in risks if r["score"] >= 5]   # Medium+
```

## Step 2 - Inventory coverage

Three coverage sources:

### Automated tests

Scan the repo for tests linked to risk IDs (via test name,
docstring, or front-matter):

```bash
grep -r "risk:R-001\|risk:PR-001" tests/ --include="*.py" \
  --include="*.js" --include="*.ts" --include="*.java" -l
```

Convention: tag tests with a `risk:<ID>` marker in name / comment:

```python
# tests/billing/test_promo_stacking.py
def test_stacked_promo_rounding_eu():
    """Risk: PR-001 (pricing engine off-by-cent in EU markets)"""
    ...
```

### Manual test cases (via TCM)

For each risk, query the TCM
([`testrail-case-management`](../../../qa-test-management/skills/testrail-case-management/SKILL.md)
or sibling) for cases linked via the refs field:

```python
def cases_for_risk(risk_id):
    return testrail_search(refs__contains=risk_id)
```

### Production monitoring

Risks mitigated by monitoring (rather than tests):

```yaml
# risk-coverage.yaml extract
PR-003:
  monitors:
    - datadog-monitor://stripe-webhook-failure-rate
    - pingdom-check://stripe-webhook-endpoint
```

## Step 3 - Build the matrix

```python
def build_coverage_matrix(risks, tests, cases, monitors):
    rows = []
    for r in risks:
        rt = [t for t in tests if r["id"] in t["tags"]]
        rc = [c for c in cases if r["id"] in c["refs"]]
        rm = [m for m in monitors if r["id"] in m["risk_ids"]]
        rows.append({
            "risk_id": r["id"],
            "risk": r["title"],
            "score": r["score"],
            "automated_tests": rt,
            "manual_cases": rc,
            "monitors": rm,
            "coverage_depth": len(rt) + len(rc) + len(rm),
        })
    return rows
```

### Coverage depth interpretation

| Depth | Verdict |
|---|---|
| 0 | **Orphan risk** - no coverage. Critical if risk score ≥ 10. |
| 1 | Minimal. Acceptable for low-score risks; insufficient for critical. |
| 2-4 | Reasonable. Multiple angles (unit + integration + monitor). |
| 5+ | Possibly over-tested. Audit for redundancy. |

## Step 4 - Emit the matrix

```markdown
# Risk coverage matrix — <release / quarter> — YYYY-MM-DD

**Total risks (score ≥ 5):** 27
**Covered:** 23 (85 %)
**Orphan risks (no coverage):** 4 — 2 critical, 2 low
**Average coverage depth:** 2.4

## Risks by coverage

| Risk ID | Risk | Score | Automated tests | Manual cases | Monitors | Depth |
|---|---|---:|---|---|---|---:|
| PR-001 | Pricing engine off-by-cent EU | 15 | tests/billing/test_promo_stacking_eu.py · tests/billing/test_rounding_properties.py | C1234 (TestRail) | datadog://pricing-anomaly | 4 |
| PR-002 | OAuth refresh-token leak via logs | 10 | tests/auth/test_log_redaction.py | C1241 | — | 2 |
| PR-003 | Stripe webhook delivery failure not retried | 16 | tests/billing/test_webhook_retry.py | C1256 + C1257 | datadog://stripe-webhook-failure-rate · pingdom://stripe-endpoint | 5 |
| **PR-007** | **Locale-specific date parsing on /reports** | **12** | **— (ORPHAN)** | — | — | **0** |
| ... | ... | ... | ... | ... | ... | ... |

## Orphan risks (critical action)

| Risk ID | Risk | Score | Why orphan |
|---|---|---:|---|
| PR-007 | Locale-specific date parsing on /reports | 12 | New risk added Q2; no tests yet |
| R-22 | Cyber-week 10x load on /search | 20 | Load test infra not in place |
| ... | ... | ... | ... |

## Over-covered risks (audit)

| Risk ID | Risk | Depth |
|---|---|---:|
| PR-001 (already shown above; depth 4 is fine but worth audit) | ... | 4 |
```

## Step 5 - Identify orphan tests

Tests with `risk:<ID>` tags pointing to retired / non-existent
risks:

```python
def find_orphan_tests(tests, risk_set):
    return [t for t in tests if t.get("risk_tag") not in risk_set]
```

These are tests written for risks that no longer exist (the risk
was retired, the feature deprecated). Audit for deletion.

## Step 6 - Executive summary

```markdown
## Risk-coverage executive summary — Q2 2026

### Headline

23 of 27 medium-or-higher risks covered (85 %). 4 orphan risks
require action before release.

### Critical orphans (must address before release)

- **PR-007** (score 12): Locale-specific date parsing on /reports.
  Recommended action: 1 manual case + 1 automated unit test (1
  person-day, owner Eve).
- **R-22** (score 20): Cyber-week 10x load on /search. Recommended
  action: k6 load-test scenario; baseline at current production
  rates (2 person-days, owner Dan).

### Possibly over-covered (audit)

- **PR-001** (depth 4): Pricing engine. Audit Q2 sprint for
  redundancy.

### Coverage debt trend

| Month | Orphan risks | Avg depth |
|---|---:|---:|
| 2026-02 | 6 | 2.1 |
| 2026-03 | 5 | 2.2 |
| 2026-04 | 5 | 2.3 |
| 2026-05 | 4 | 2.4 |

Trend: improving slowly. Continue current cadence.
```

## Step 7 - CI integration

Re-build the matrix on every PR; fail if a critical-score risk
becomes uncovered:

```yaml
- name: Risk coverage check
  run: |
    python scripts/build-risk-coverage.py \
      --risks risks.yaml \
      --output risk-coverage.md \
      --fail-on-orphan-score 15
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Map only release-scope risks | Long-lived product risks invisible | Include [`product-risk-register-builder`](../product-risk-register-builder/SKILL.md) entries |
| Treat depth 1 = "covered" universally | Critical risks need depth ≥ 2 | Tier the verdict by risk score |
| Untagged tests | Risk linkage manual; drifts | Adopt the `risk:<ID>` convention; lint for it |
| No orphan-tests audit | Test suite bloats with risks-since-retired | Run Step 5 each cycle |
| Monitors not in the matrix | "Mitigated via monitoring" claims unverifiable | Always list the specific monitor IDs |
| Single snapshot, no trend | Can't tell if coverage is improving | Track over time (Step 6) |
| Build matrix once per release | Stale within the release | Build per PR; cache for incremental updates |

## Limitations

- **Tag discipline required.** If tests aren't tagged, the matrix
  under-reports coverage.
- **Doesn't measure *test quality*.** A risk with 5 weak tests
  vs 1 strong test reads the same in the matrix; pair with
  [`test-case-quality-critic`](../../../qa-test-management/agents/test-case-quality-critic.md).
- **Risk score is upstream judgement.** If the score is wrong
  (under- or over-stated), the coverage requirement is wrong.
- **Monitor coverage is hard to validate.** A Datadog monitor
  exists ≠ it would catch the risk.
- **Cross-team coverage gaps.** Risks owned by one team may have
  mitigations in another team's repo; cross-team scanning needed.

## References

- ISTQB Advanced Test Manager (CTAL-TM) syllabus, ch. 5 on
  risk-based testing + risk-coverage measurement.
- ISTQB Glossary - 
  [glossary.istqb.org](https://glossary.istqb.org/) - "coverage
  item", "test condition".
- ISO/IEC/IEEE 29119-3:2021 §6.3 - traceability.
- Composes:
  [`risk-matrix`](../risk-matrix/SKILL.md),
  [`product-risk-register-builder`](../product-risk-register-builder/SKILL.md),
  [`traceability-matrix-builder`](../../../qa-test-management/skills/traceability-matrix-builder/SKILL.md).
- Consumed by:
  [`risk-assessment-critic`](../../agents/risk-assessment-critic.md),
  [`risk-based-test-selector`](../../agents/risk-based-test-selector.md),
  [`risk-based-test-planner`](../../agents/risk-based-test-planner.md).
