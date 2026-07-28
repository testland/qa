---
name: qa-okr-author
description: "Build-an-X workflow that drafts a QA team's quarterly OKR set - one to three Objectives, each with 3 - 5 measurable Key Results - from the team's current state (risk matrix, defect-trend narrative, test-run history, test-pyramid balance, compliance coverage). Every numeric target cites its source artifact (e.g., a defect-trend baseline's 2026-Q1 escape rate). QA-specific by design - generic OKR generators (Tability, Asana, ClickUp) don't know test metrics; the differentiation is the domain. Produces the OKR set itself - not the test-strategy document it sits inside, and not the risk-score calibration behind the baselines. Use at the start of each quarter to draft the OKR set the manager edits and the team commits to."
---

# qa-okr-author

## Overview

The QA manager opens a blank document at quarter-start to draft OKRs. Generic OKR templates (Tability, Asana, ClickUp) all share the same flaw: they don't know what to measure for a QA team. "Improve quality" is not an Objective; "achieve 95% pass rate" is not a Key Result without a baseline and a documented method. This skill produces a draft anchored on the team's actual current-state data, with every numeric target citing the artifact it came from.

Per the canonical OKR framework ([Doerr, *Measure What Matters*](https://en.wikipedia.org/wiki/Objectives_and_key_results)), an Objective is a concrete, inspirational goal and each Key Result is measurable success criteria with "no opportunity for 'grey area'". The **0.7/1.0 grading rule is stated once here and referenced thereafter**: this skill emits **Committed** KRs (target 1.0 grading, binary outcomes the team promises) and **Aspirational** KRs (target 0.7, stretch, where 70% is success). Consistently hitting 100% means the OKRs are not aspirational enough.

## When to use

- Quarter-start: the team is committing to OKRs and needs a draft anchored on current data, not blank-page guesswork.
- Mid-quarter pivot: a strategic shift (new product line, regulatory deadline, incident-driven priority change) requires re-drafting OKRs against fresh baseline data.
- New manager onboarding: a manager taking over a team needs to read the team's quality posture and propose OKRs that bridge from current to target state.
- Pre-board / pre-leadership review: the manager needs to articulate quality goals to executives with cited evidence.

Do **not** use this skill when:

- The team has no measurable baseline data (no defect history, no test-run history, no risk matrix). Without measurable inputs, the KRs are aspirational fiction - escalate to upstream authoring skills first.
- The Objective is already locked by leadership and you only need the KRs - use the [Committed KR shape](#step-3--draft-committed-vs-aspirational-key-results) directly.
- You want a generic company-wide OKR - that's Tability / Asana / ClickUp territory; this skill is QA-domain-specific.

## Step 1 - Capture the inputs

Required:

| Input | Source | Why load-bearing |
|---|---|---|
| **Quarterly objective(s)** | Manager-provided; aligned with engineering / product OKRs | The skill drafts KRs *under* objectives the team owns; it won't invent strategic direction |
| **Current-state metrics** | At least one of: `risk-matrix` output, a recent defect-trend report, `test-run-summary-author` cross-run-trend, `test-pyramid-balancer` audit | Every KR needs a baseline - without it, the target is unanchored |
| **Time horizon** | Quarterly (default) or other (semi-annual) | OKR cadence; per Doerr, quarterly is the canonical rhythm |
| **Prior OKR set** | If exists; the prior quarter's KRs + their grading | Continuity: drift from prior commitments is itself a signal |

The skill halts with `MISSING_BASELINE` (supply ≥1 current-state metric source) if no measurable input is offered.

## Step 2 - Walk the QA-OKR shape catalog

The skill recognises five canonical QA Objective shapes (catalog, not prescription); the manager picks 1 - 3 and the skill drafts the measurable KR family under each:

1. **Strengthen the test pyramid** - layer ratio, cycle time, E2E budget.
2. **Reduce escape-defect rate** - escape volume, time-to-detect, category-specific.
3. **Cut regression cycle time** - wall-clock, parallelisation, CI cost.
4. **Reduce flake-budget consumption** - quarantine ceiling, flake rate, repair velocity.
5. **Close compliance evidence gaps** - per-control coverage, evidence freshness, audit pass-rate.

The full catalog - each shape's KR-axis table, example KRs, and baseline source - is in [references/okr-shape-catalog.md](references/okr-shape-catalog.md). Shape 2 is realized end to end in Step 3.

## Step 3 - Draft committed vs aspirational Key Results

Each KR is flagged **Committed** or **Aspirational** per the grading rule stated in the Overview (target 1.0 vs 0.7):

```markdown
## Objective 2 - Reduce escape-defect rate

**Quarter:** 2026-Q3 (Jul-Sep)
**Rationale:** Current quarterly P1 escape rate is 4 (per the defect-trend 2026-Q2 report - citing `tracker-export-2026-Q2.json` lines `filter(severity=P1, found_in=production)`). Industry context: PractiTest 2026 finds 19.9% of teams use AI for risk identification - the team is below this. Reducing escape rate is the team's primary tied-to-revenue quality metric.

### Key Results

| # | Type | KR | Baseline | Source |
|---|---|---|---|---|
| KR2.1 | **Committed** | P1 escapes reach ≤ 2/quarter | 4/quarter (2026-Q2) | the defect-trend report |
| KR2.2 | **Committed** | P2 escapes reach ≤ 8/quarter | 13/quarter (2026-Q2) | the defect-trend report |
| KR2.3 | **Aspirational** | MTTD on P1 reaches ≤ 4h (median) | 11h (2026-Q2) | `mttr-mtbf-tracker` |
| KR2.4 | **Aspirational** | Regression-class escapes reach -50% vs Q2 | 18 → 9 | the defect-clustering export + the defect-trend report |

### Scoring (per Doerr / Grove canon)

- Committed KRs (2.1, 2.2): grading target 1.0 - anything <1.0 is a miss.
- Aspirational KRs (2.3, 2.4): grading target 0.7 - 70% achievement is success.

### Risk if all KRs are committed

The team avoids risk by setting only committed KRs at safe levels. Per Doerr: "Consistently meeting 100% indicates OKRs need re-evaluation." Mix at least one aspirational KR per Objective.
```

## Step 4 - Cite every numeric target

The skill refuses to emit a KR target without citing the baseline. The output's audit appendix is the load-bearing artifact that lets the team verify the draft is grounded:

```markdown
### Audit (sources for every numeric target)

| KR | Target | Baseline | Source artifact / query |
|---|---|---|---|
| KR1.1 | unit:integration:E2E = 70:20:10 | 41:14:45 | `test-pyramid-balancer` 2026-Q2 output |
| KR1.2 | regression duration < 45 min/shard | 67 min/shard | `test-run-summary-author cross-run-trend` 2026-Q2 |
| KR2.1 | P1 escapes ≤ 2/quarter | 4/quarter | the defect-trend report filter(severity=P1, found_in=production, window=2026-Q2) |
| KR2.3 | MTTD P1 ≤ 4h median | 11h median | `mttr-mtbf-tracker` per-incident log, 2026-Q2 |
| KR3.1 | flake rate < 3% of runs | 8% | the flake-detection weekly export 2026-Q2 |
| KR3.2 | quarantine list ≤ 5 | 11 | `flaky-test-quarantine` snapshot 2026-06-30 |
```

If a baseline is not retrievable, the KR is flagged `[BASELINE_NEEDED]` in the draft and excluded from the committed set until the team supplies the data.

## Step 5 - Cross-check against organisational alignment

OKRs are not authored in isolation. The skill emits an **alignment check** section the manager fills before committing:

```markdown
### Alignment check

| Layer | OKR or theme | This QA OKR set's contribution |
|---|---|---|
| Company quarterly theme | "Reduce mean revenue-affecting incident cost" | Objective 2 (escape rate) directly contributes |
| Engineering OKR | "Cut release cycle to weekly" | Objective 3 (regression cycle time) directly contributes |
| Product OKR | "Ship Feature X with high-stakes user impact" | Objective 2 ties to risk-prevention; Objective 5 ties to compliance review |
| SRE OKR | "Maintain 99.9% SLO" | Objective 2 (escape rate) and Objective 4 (flake budget) tie via `error-budget-tests` |
```

Per Doerr, OKRs at the team level should "ladder up" to company OKRs. The skill makes the laddering explicit so the team can validate alignment in stakeholder review.

## Step 6 - Hand off to retro / quarterly review

The OKR set is the start of the loop, not the end. Hand-offs at quarter-end:

- **Quarterly OKR retro**: did we hit the KRs? Aspirational KRs at 0.7+ are wins; committed KRs at <1.0 are misses requiring action.
- **Drift analysis**: if multiple quarters show the same Objective without progress, the Objective is wrong (too vague, too ambitious, or not under the team's control).
- **Source-artifact regeneration**: the same baseline sources (the defect-trend report, `test-run-summary-author`, etc.) emit the end-of-quarter metrics; the comparison is mechanical.

## Worked example

A full quarter-start draft for a 6-engineer QA team - two Objectives (escape-defect
rate, regression cycle time) with committed/aspirational KRs, an alignment check, and
a per-target audit table - is in [references/worked-example.md](references/worked-example.md).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Setting KRs without baselines | "Reach 99% pass rate" - from what? The KR is unanchored; success can't be measured | Step 4 enforces baseline citation; flag `[BASELINE_NEEDED]` if missing |
| 100% committed KRs, no aspirational | Per Doerr: "If 100% of the key results are consistently being met, the key results should be reevaluated" | At least one aspirational KR per Objective |
| KRs that aren't team-controllable | "Customer churn -50%" - QA can't move that lever alone | KRs are scoped to outcomes QA can directly cause |
| Six or more Objectives | Loss of focus; per the canonical framework, 1 - 3 Objectives is the recommended ceiling | Step 1 caps Objectives at 3 |
| KR with no measurable axis ("improve quality") | Not gradeable; the team cannot tell if it succeeded | Step 3 rejects un-measurable KRs |
| KRs that drift from the prior quarter without acknowledging the drift | Continuous re-targeting hides chronic underperformance | Step 1 ingests prior OKR set; drift surfaces in the rationale |
| Generic OKR template adopted without QA-specific KRs | The team commits to "ship more features" goals that don't measure quality | This skill is QA-domain-specific by design |
| Author OKRs without alignment to engineering / product | The team commits to goals nobody else cares about | Step 5 alignment check is required |

## Limitations

- **Baseline data must exist.** A team with no defect tracker, no CI history, no risk matrix has no anchor for KRs. The skill halts; the team supplies the data via upstream authoring skills.
- **Domain-knowledge ceiling.** The skill knows QA metrics; it does not know the business (revenue, customer impact). The manager must supply the "why" rationale for each Objective.
- **Aspirational vs committed mix is opinion.** Doerr recommends a mix; the team's culture determines the right ratio. The skill emits both flavors; the manager picks.
- **Quarterly cadence assumed.** Other cadences (semi-annual, monthly) work mechanically; the skill defaults to quarterly per the canonical framework.
- **No automatic grading.** End-of-quarter grading is a separate workflow (deferred to a future `qa-okr-retro-reviewer` agent). This skill only authors; grading happens at retro time.
- **No org-tier OKR alignment automation.** The Step 5 alignment check is manual; the skill does not pull company-tier OKRs from a separate system.

## Hand-off targets

- **Author the strategy doc the OKRs sit inside** → `test-strategy-author`.
- **Generate the cross-run trend for Shape 3** → `test-run-summary-author` (cross-run-trend output shape).
- **Audit the pyramid baseline for Shape 1** → `test-pyramid-balancer`.
- **Quarterly OKR retro / drift review** → deferred (candidate `qa-okr-retro-reviewer` agent, Phase 7+).

## References

- *Measure What Matters* (John Doerr, 2018) - canonical modern OKR reference; covers committed vs aspirational, 0.7 sweet spot, 1 - 3 objectives per cadence. Origin: Andy Grove at Intel in the 1970s, documented in *High Output Management* (1983), introduced to Google by Doerr in 1999: https://en.wikipedia.org/wiki/Objectives_and_key_results
- ISTQB glossary - test management (the discipline OKRs sit under): https://glossary.istqb.org/en_US/term/test-management
- ISTQB glossary - S.M.A.R.T. goal methodology (specific / measurable / attainable / relevant / timely - the framing each KR must satisfy): https://glossary.istqb.org/en_US/term/smart-goal-methodology
- ISTQB glossary - defect density (canonical metric for Shape 2 KRs): https://glossary.istqb.org/en_US/term/defect-density
- ISTQB glossary - escaped defect: https://glossary.istqb.org/en_US/term/escaped-defect
- Google Testing Blog, "Flaky Tests at Google and How We Mitigate Them" - flake-prevalence baseline for Shape 4 KRs (about 16% of tests show some flakiness): https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html
- PractiTest 2026 State of Testing Report - manager-tier survey; 19.9% of teams use AI for risk identification (cited in Shape 2 rationale): https://www.practitest.com/state-of-testing/
- `test-strategy-author`, `risk-matrix`, `test-pyramid-balancer`, `e2e-suite-budget` - sibling skills in the same plugin that feed inputs.
- `test-run-summary-author`, `mttr-mtbf-tracker` - cross-plugin baseline-source skills.
