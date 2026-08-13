# Risk-register review checklist

Deep reference for the `risk-matrix` SKILL.md. A hygiene checklist for auditing a risk register (per-release matrix or product register) for assessment quality before release planning or a quarterly review. Blocks substandard risk assessments from driving release planning.

Inputs: the register under review, optionally the coverage matrix from the
SKILL.md coverage mapping section, and the decisions folder for accepted
risks. Output: per-risk findings + a single register-level verdict
(pass / block / pass-with-caveats).

## Check 1 - Field completeness

Every entry must have:

| Field | Required? | BLOCK if missing? |
|---|:---:|:---:|
| ID | ✓ | ✓ |
| Risk title | ✓ | ✓ |
| Category | ✓ | ✓ |
| Impact (1-5) | ✓ | ✓ |
| Likelihood (1-5) | ✓ | ✓ |
| Score | ✓ | ✓ (computed = I × L) |
| Strategy (Avoid / Mitigate / Transfer / Accept) | ✓ | ✓ |
| Mitigation OR decision link | ✓ | ✓ |
| Owner | ✓ | ✓ |
| Last review date | ✓ | ✓ |

## Check 2 - Independence of impact and likelihood

Impact + likelihood must be **independently scored**, not auto-equated:

```python
def check_independence(risks):
    issues = []
    pairs = [(r["impact"], r["likelihood"]) for r in risks]
    diag_count = sum(1 for i, l in pairs if i == l)
    if len(pairs) > 5 and diag_count / len(pairs) > 0.7:
        issues.append(
            f"{diag_count}/{len(pairs)} risks have impact == likelihood. "
            "Likely auto-equated; force independent scoring."
        )
    return issues
```

If >70% of risks have `impact == likelihood`, the register is suspect
(the same principle as scoring defect severity and priority independently).

## Check 3 - Strategy discipline

For each "Accept" decision, verify a written acceptance-decision memo exists
(who accepted, what evidence, expiry / revisit date). Any Accept without a
linked decision document = BLOCK.

For each "Transfer" decision, verify the receiving party
(insurance / vendor / SLA) is named. Without it, "Transfer" is
hand-wave Accept.

## Check 4 - Mitigation-to-coverage linkage

Build the coverage matrix per the SKILL.md coverage mapping section, then:

```python
orphans_critical = [r for r in matrix if r["coverage_depth"] == 0 and r["score"] >= 15]
orphans_high = [r for r in matrix if r["coverage_depth"] == 0 and 10 <= r["score"] < 15]
```

- Critical-score orphans (≥15) = BLOCK
- High-score orphans (10-14) = warning
- Medium-score orphans (5-9) = info

## Check 5 - Escalation evidence

Risks scoring ≥15 must have escalation evidence:

| Score | Required escalation |
|---|---|
| 15-19 | Engineering director or equivalent named in owner / reviewer field |
| 20-25 | VP / CTO / CISO sign-off recorded in review log |

Without it, the register has under-escalated risks = caveat.

## Check 6 - Review cadence

Per the register type:

| Register | Cadence | Stale after |
|---|---|---|
| Per-release matrix (SKILL.md) | Weekly during sprint | 14 days |
| Product register ([product-risk-register.md](product-risk-register.md)) | Quarterly | 100 days |
| Project register ([project-risk-register.md](project-risk-register.md)) | Weekly | 14 days |

If most entries' `last_review` is older than the threshold, the
register is stale.

## Check 7 - Verdict + report

```markdown
# Risk-register audit - Q2 2026 release matrix - YYYY-MM-DD

**Risks audited:** 27 active + 4 retired
**Findings:** 6 critical, 9 warnings
**Verdict:** BLOCK - 3 critical findings require fix before release

## Critical (must fix before release planning)

| # | Risk ID | Finding |
|---|---|---|
| 1 | R-14 | Strategy "Accept" without linked decision document |
| 2 | R-22 | Score 20 (impact 5 × likelihood 4); coverage depth 0 (ORPHAN). No test, no monitor, no decision. |
| 3 | PR-009 | Score 16; last review 137 days ago (stale for product register; threshold 100 d) |

## Warnings

| Risk ID | Finding |
|---|---|
| R-08 | impact 3 = likelihood 3 = score 9; pattern repeats for 19/27 entries - likely auto-equated |
| PR-003 | Strategy "Transfer" but recipient not named |
| R-11 | Owner field empty |
| ... | ... |

## Coverage integration

- 4 of 27 risks are orphan (no coverage). Of these:
 - 2 critical (score ≥15) - BLOCK above
 - 2 low (score <10) - info

## Acceptance decisions integration

- 3 Accept decisions found. 2 have linked documents (R-08, R-12);
  1 missing (R-14 - BLOCK above)

## Review cadence

- Average `last_review`: 18 days
- Stale entries (>14 days for release matrix): 7 of 27
- Most-stale: PR-009 at 137 days

## Action items

1. **R-14**: Either author the acceptance decision memo or change
   strategy to Mitigate / Transfer.
2. **R-22**: Add at least one mitigation + one test before release.
3. **PR-009**: Re-review now; update `last_review` date.

After fixes, re-run this checklist.
```

## Never-pass rules

A register review **never** returns "pass" when any of these hold:

- Any critical-score risk is orphan in coverage.
- Any "Accept" decision lacks a written decision document.
- More than 50% of entries are stale per the applicable cadence.
- Findings were suppressed without a per-risk waiver.

The review reports and recommends; it never auto-fixes register fields.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Auditing only critical-score orphans | Medium-score risks accumulate coverage debt | Run all 7 checks |
| Treating "Accept" as default for inconvenient risks | Decision discipline collapses | Require documented decisions per acceptance |
| Skipping the independence check | Auto-equated scores produce misleading priorities | Always run Check 2 |
| Auditing once per release only | Risks drift between release cycles | Audit weekly for release matrices |
| Score thresholds different per team | Cross-team metrics meaningless | Standardise the threshold table; audit against it |
| Reviewers in owner column for "accountability" | Owner ≠ reviewer; concentrates blame | Distinguish owner from reviewer fields |

## Limitations

- **Subjective scoring.** The checklist checks *discipline*, not
  *correctness* of impact / likelihood values.
- **Cadence threshold is org-policy.** Defaults from ISTQB CTAL-TM
  but teams may justify exceptions.
- **Coverage check depends on the coverage-mapping output.** If
  tags / refs aren't disciplined, coverage is under-reported; the
  review shows orphans that may actually be covered.
- **Doesn't validate decisions.** A documented Accept decision
  with bad rationale still passes the linkage check; pair with
  human review of decisions themselves.

## References

- ISO 31000:2018 - cite by stable ID.
- ISTQB Advanced Test Manager (CTAL-TM) syllabus, ch. 5.
- Sibling references:
  [product-risk-register.md](product-risk-register.md),
  [project-risk-register.md](project-risk-register.md),
  [calibration.md](calibration.md).
