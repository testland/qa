---
name: qa-okr-author
description: "Build-an-X workflow that drafts a QA team's quarterly OKR set - one to three Objectives, each with 3 - 5 measurable Key Results - from the team's current state (risk matrix, defect-trend narrative, test-run history, test-pyramid balance, compliance coverage). Every numeric target cites its source artifact (e.g., `defect-trend-narrator` 2026-Q1 escape rate). QA-specific by design - generic OKR generators (Tability, Asana, ClickUp) don't know test metrics; the differentiation is the domain. Distinct from `test-strategy-author` (which authors the strategy doc) and from `risk-matrix-recommender` (which calibrates risk inputs). Use at the start of each quarter to draft the OKR set the manager edits and the team commits to."
---

# qa-okr-author

## Overview

The QA manager opens a blank document at quarter-start to draft OKRs. Generic OKR templates (Tability, Asana, ClickUp) all share the same flaw: they don't know what to measure for a QA team. "Improve quality" is not an Objective; "achieve 95% pass rate" is not a Key Result without a baseline and a documented method. This skill produces a draft anchored on the team's actual current-state data, with every numeric target citing the artifact it came from.

Per the canonical OKR framework ([Doerr 2018, *Measure What Matters*; Grove's original formulation at Intel](https://en.wikipedia.org/wiki/Objectives_and_key_results)), each Objective is "a significant, concrete, clearly defined goal that is inspirational," and each Key Result is "measurable success criteria using 0 - 100% scales or numerical values with no ambiguity." Doerr recommends organizations target a **70% success rate** - consistently hitting 100% means the OKRs need to be more aspirational. This skill emits both Committed KRs (target: 1.0 grading, binary outcomes) and Aspirational KRs (target: 0.7 grading, stretch).

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
| **Current-state metrics** | At least one of: [`risk-matrix`](../risk-matrix/SKILL.md) output, [`defect-trend-narrator`](../../../qa-bug-repro/agents/defect-trend-narrator.md) recent report, [`test-run-summary-author`](../../../qa-test-reporting/skills/test-run-summary-author/SKILL.md) cross-run-trend, [`test-pyramid-balancer`](../test-pyramid-balancer/SKILL.md) audit | Every KR needs a baseline - without it, the target is unanchored |
| **Time horizon** | Quarterly (default) or other (semi-annual) | OKR cadence; per [Doerr](https://en.wikipedia.org/wiki/Objectives_and_key_results), quarterly is the canonical rhythm |
| **Prior OKR set** | If exists; the prior quarter's KRs + their grading | Continuity: drift from prior commitments is itself a signal |

The skill halts with `MISSING_BASELINE` (supply ≥1 current-state metric source) if no measurable input is offered.

## Step 2 - Walk the QA-OKR shape catalog

Five canonical QA Objective shapes the skill recognises (catalog, not prescription). Each maps to a measurable KR family. The manager picks 1 - 3; the skill drafts the KRs.

### Shape 1 - Strengthen the test pyramid

Anchored on [`test-pyramid-balancer`](../test-pyramid-balancer/SKILL.md). Used when the suite is E2E-heavy and shifting weight downward improves cycle time + maintainability.

| KR axis | Example KR | Baseline source |
|---|---|---|
| Layer ratio | unit:integration:E2E reaches 70:20:10 | current ratio per `test-pyramid-balancer` |
| Cycle time | regression suite duration < 45 min per shard | current per `test-run-summary-author` |
| E2E suite budget | E2E test count ≤ 200, growth rate ≤ 5/quarter | [`e2e-suite-budget`](../e2e-suite-budget/SKILL.md) |

### Shape 2 - Reduce escape-defect rate

Anchored on [`defect-trend-narrator`](../../../qa-bug-repro/agents/defect-trend-narrator.md). Used when production defects are above the team's tolerance.

| KR axis | Example KR | Baseline source |
|---|---|---|
| Volume | P1 escapes < 2/quarter; P2 escapes < 10/quarter | current per `defect-trend-narrator` quarterly report |
| Time-to-detect | MTTD on P1 < 4 hours | per [`mttr-mtbf-tracker`](../../../qa-resilience-drills/skills/mttr-mtbf-tracker/SKILL.md) |
| Category-specific | regression-class escapes -50% WoW | per [`defect-clusterer`](../../../qa-bug-repro/agents/defect-clusterer.md) + `defect-trend-narrator` |

### Shape 3 - Cut regression cycle time

Anchored on [`test-run-summary-author`](../../../qa-test-reporting/skills/test-run-summary-author/SKILL.md). Used when CI is the bottleneck.

| KR axis | Example KR | Baseline source |
|---|---|---|
| Wall-clock | regression suite < 60 min per shard, 4× parallel | `test-run-summary-author` |
| Parallelisation | sharding factor ≥ 8 with no shard >90 min | CI config + `test-run-summary-author` |
| CI cost | per-PR CI cost -30% via TIA | [`regression-suite-selector`](../../../qa-test-impact-analysis/skills/regression-suite-selector/SKILL.md) |

### Shape 4 - Reduce flake-budget consumption

Anchored on [`ai-flake-detector`](../../../qa-flake-triage/agents/ai-flake-detector.md) + [`flaky-test-quarantine`](../../../qa-flake-triage/skills/flaky-test-quarantine/SKILL.md). Used when flake rate is above the team's tolerance (flakiness is widespread and well-documented: about 16% of tests at Google show some flakiness per the [Google Testing Blog](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html); for KR targets, below 5% is aspirational and under 10% is a reasonable committed bar).

| KR axis | Example KR | Baseline source |
|---|---|---|
| Quarantine ceiling | quarantine list ≤ 5 at any point | current per `flaky-test-quarantine` |
| Flake rate | flake rate < 3% of CI runs (vs 8% current baseline) | per `ai-flake-detector` weekly history |
| Repair velocity | mean time-to-repair on quarantined test < 5 days | per `flaky-test-quarantine` |

### Shape 5 - Close compliance evidence gaps

Anchored on [`compliance-readiness-reviewer`](../../../qa-compliance/agents/compliance-readiness-reviewer.md). Used in regulated industries (healthcare, finance, automotive).

| KR axis | Example KR | Baseline source |
|---|---|---|
| Per-control coverage | SOC 2 Trust Service Criteria coverage ≥ 95% | `compliance-readiness-reviewer` |
| Evidence freshness | every control's evidence ≤ 90 days old | [`soc2-evidence-collector`](../../../qa-compliance/skills/soc2-evidence-collector/SKILL.md) |
| Audit pass-rate | external audit findings ≤ 3, no high-severity | prior audit history |

Other Objective shapes are valid; these are the most-cited in QA-manager-facing literature.

## Step 3 - Draft committed vs aspirational Key Results

Per the [canonical framework](https://en.wikipedia.org/wiki/Objectives_and_key_results), each KR is either **Committed** (target grading 1.0, binary outcomes the team promises to ship) or **Aspirational** (target grading 0.7, stretch goals where 70% completion is success).

The skill flags each KR explicitly:

```markdown
## Objective 2 — Reduce escape-defect rate

**Quarter:** 2026-Q3 (Jul–Sep)
**Rationale:** Current quarterly P1 escape rate is 4 (per `defect-trend-narrator` 2026-Q2 report — citing `tracker-export-2026-Q2.json` lines `filter(severity=P1, found_in=production)`). Industry context: PractiTest 2026 finds 19.9% of teams use AI for risk identification — the team is below this. Reducing escape rate is the team's primary tied-to-revenue quality metric.

### Key Results

| # | Type | KR | Baseline | Source |
|---|---|---|---|---|
| KR2.1 | **Committed** | P1 escapes reach ≤ 2/quarter | 4/quarter (2026-Q2) | `defect-trend-narrator` |
| KR2.2 | **Committed** | P2 escapes reach ≤ 8/quarter | 13/quarter (2026-Q2) | `defect-trend-narrator` |
| KR2.3 | **Aspirational** | MTTD on P1 reaches ≤ 4h (median) | 11h (2026-Q2) | `mttr-mtbf-tracker` |
| KR2.4 | **Aspirational** | Regression-class escapes reach -50% vs Q2 | 18 → 9 | `defect-clusterer` + `defect-trend-narrator` |

### Scoring (per Doerr / Grove canon)

- Committed KRs (2.1, 2.2): grading target 1.0 — anything <1.0 is a miss.
- Aspirational KRs (2.3, 2.4): grading target 0.7 — 70% achievement is success.

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
| KR2.1 | P1 escapes ≤ 2/quarter | 4/quarter | `defect-trend-narrator` filter(severity=P1, found_in=production, window=2026-Q2) |
| KR2.3 | MTTD P1 ≤ 4h median | 11h median | `mttr-mtbf-tracker` per-incident log, 2026-Q2 |
| KR3.1 | flake rate < 3% of runs | 8% | `ai-flake-detector` weekly export 2026-Q2 |
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

Per [Doerr](https://en.wikipedia.org/wiki/Objectives_and_key_results), OKRs at the team level should "ladder up" to company OKRs. The skill makes the laddering explicit so the team can validate alignment in stakeholder review.

## Step 6 - Hand off to retro / quarterly review

The OKR set is the start of the loop, not the end. Hand-offs at quarter-end:

- **Quarterly OKR retro**: did we hit the KRs? Aspirational KRs at 0.7+ are wins; committed KRs at <1.0 are misses requiring action.
- **Drift analysis**: if multiple quarters show the same Objective without progress, the Objective is wrong (too vague, too ambitious, or not under the team's control).
- **Source-artifact regeneration**: the same baseline-source skills (`defect-trend-narrator`, `test-run-summary-author`, etc.) emit the end-of-quarter metrics; the comparison is mechanical.

## Worked example - quarter-start draft for a 6-engineer QA team

Input:
- Objectives the manager has aligned with engineering: (a) reduce escape-defect rate, (b) cut regression cycle time.
- Current state: 4 P1 escapes / quarter, 13 P2 escapes / quarter, regression suite 67min/shard, flake rate 8%, no compliance scope.
- Prior quarter: P1 escapes were 6 (improving), regression was 75min (improving).

Output:

```markdown
# QA OKRs — 2026-Q3 (Jul–Sep)

## Objective 1 — Reduce escape-defect rate

**Why:** Q2 P1 escapes (4) caused ~$X revenue impact per the customer-success retro. Q1 was 6; the trend is improving. Q3 target accelerates the trend.

| # | Type | KR | Baseline | Source |
|---|---|---|---|---|
| KR1.1 | Committed | P1 escapes ≤ 2 | 4 (Q2) | `defect-trend-narrator` |
| KR1.2 | Committed | P2 escapes ≤ 8 | 13 (Q2) | `defect-trend-narrator` |
| KR1.3 | Aspirational | MTTD P1 ≤ 4h median | 11h (Q2) | `mttr-mtbf-tracker` |
| KR1.4 | Aspirational | Regression-class escapes -50% | 18 → 9 | `defect-clusterer` |

## Objective 2 — Cut regression cycle time

**Why:** Engineering's "release weekly" OKR depends on regression < 60 min/shard. Q2 was 67 min.

| # | Type | KR | Baseline | Source |
|---|---|---|---|---|
| KR2.1 | Committed | Regression suite < 60 min/shard | 67 min (Q2) | `test-run-summary-author` |
| KR2.2 | Committed | Sharding factor ≥ 8, no shard > 75 min | 6, max shard 67 min (Q2) | CI config + summary |
| KR2.3 | Aspirational | Per-PR CI cost -30% via TIA | $0.42/PR (Q2) | `regression-suite-selector` adoption |

### Alignment check

| Layer | OKR | Contribution |
|---|---|---|
| Company Q3 theme | "Reduce revenue-affecting incident cost" | Objective 1 directly |
| Engineering | "Release weekly" | Objective 2 directly |
| SRE | "Maintain 99.9% SLO" | Objective 1 (via escape rate) |

### Audit

| KR | Target | Baseline | Source |
|---|---|---|---|
| KR1.1 | ≤2 | 4 | `defect-trend-narrator` filter(severity=P1, found_in=production, window=2026-Q2) |
| KR1.2 | ≤8 | 13 | same filter, severity=P2 |
| KR1.3 | ≤4h median | 11h median | `mttr-mtbf-tracker` log 2026-Q2 |
| KR1.4 | 9 | 18 | `defect-clusterer` category=regression, 2026-Q2 |
| KR2.1 | <60 min/shard | 67 min/shard | `test-run-summary-author` cross-run-trend 2026-Q2 |
| KR2.2 | shard≥8 | shard=6 | `playwright.config.ts` workers + `test-run-summary-author` |
| KR2.3 | -30% per-PR | $0.42/PR | CI billing export + `regression-suite-selector` adoption rate |
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Setting KRs without baselines | "Reach 99% pass rate" - from what? The KR is unanchored; success can't be measured | Step 4 enforces baseline citation; flag `[BASELINE_NEEDED]` if missing |
| 100% committed KRs, no aspirational | Per [Doerr](https://en.wikipedia.org/wiki/Objectives_and_key_results): "Consistently meeting 100% indicates OKRs need re-evaluation" | At least one aspirational KR per Objective |
| KRs that aren't team-controllable | "Customer churn -50%" - QA can't move that lever alone | KRs are scoped to outcomes QA can directly cause |
| Six or more Objectives | Loss of focus; per the canonical framework, 1 - 3 Objectives is the recommended ceiling | Step 1 caps Objectives at 3 |
| KR with no measurable axis ("improve quality") | Not gradeable; the team cannot tell if it succeeded | Step 3 rejects un-measurable KRs |
| KRs that drift from the prior quarter without acknowledging the drift | Continuous re-targeting hides chronic underperformance | Step 1 ingests prior OKR set; drift surfaces in the rationale |
| Generic OKR template adopted without QA-specific KRs | The team commits to "ship more features" goals that don't measure quality | This skill is QA-domain-specific by design |
| Author OKRs without alignment to engineering / product | The team commits to goals nobody else cares about | Step 5 alignment check is required |

## Limitations

- **Baseline data must exist.** A team with no defect tracker, no CI history, no risk matrix has no anchor for KRs. The skill halts; the team supplies the data via upstream authoring skills.
- **Domain-knowledge ceiling.** The skill knows QA metrics; it does not know the business (revenue, customer impact). The manager must supply the "why" rationale for each Objective.
- **Aspirational vs committed mix is opinion.** [Doerr](https://en.wikipedia.org/wiki/Objectives_and_key_results) recommends a mix; the team's culture determines the right ratio. The skill emits both flavors; the manager picks.
- **Quarterly cadence assumed.** Other cadences (semi-annual, monthly) work mechanically; the skill defaults to quarterly per the canonical framework.
- **No automatic grading.** End-of-quarter grading is a separate workflow (deferred to a future `qa-okr-retro-reviewer` agent). This skill only authors; grading happens at retro time.
- **No org-tier OKR alignment automation.** The Step 5 alignment check is manual; the skill does not pull company-tier OKRs from a separate system.

## Hand-off targets

- **Author the strategy doc the OKRs sit inside** → [`test-strategy-author`](../test-strategy-author/SKILL.md).
- **Calibrate the risk matrix that feeds Shape 5** → [`risk-matrix-recommender`](../../agents/risk-matrix-recommender.md).
- **Generate the per-quarter defect-trend baseline for Shape 2** → [`defect-trend-narrator`](../../../qa-bug-repro/agents/defect-trend-narrator.md).
- **Generate the cross-run trend for Shape 3** → [`test-run-summary-author`](../../../qa-test-reporting/skills/test-run-summary-author/SKILL.md) (cross-run-trend output shape).
- **Audit the pyramid baseline for Shape 1** → [`test-pyramid-balancer`](../test-pyramid-balancer/SKILL.md).
- **Audit the compliance baseline for Shape 5** → [`compliance-readiness-reviewer`](../../../qa-compliance/agents/compliance-readiness-reviewer.md).
- **Quarterly OKR retro / drift review** → deferred (candidate `qa-okr-retro-reviewer` agent, Phase 7+).

## References

- *Measure What Matters* (John Doerr, 2018) - canonical modern OKR reference; covers committed vs aspirational, 0.7 sweet spot, 1 - 3 objectives per cadence. Origin: Andy Grove at Intel in the 1970s, documented in *High Output Management* (1983), introduced to Google by Doerr in 1999: https://en.wikipedia.org/wiki/Objectives_and_key_results
- ISTQB glossary - test management (the discipline OKRs sit under): https://glossary.istqb.org/en_US/term/test-management
- ISTQB glossary - quality goal: https://glossary.istqb.org/en_US/term/quality-goal
- ISTQB glossary - defect density (canonical metric for Shape 2 KRs): https://glossary.istqb.org/en_US/term/defect-density
- ISTQB glossary - escaped defect: https://glossary.istqb.org/en_US/term/escaped-defect
- Google Testing Blog, "Flaky Tests at Google and How We Mitigate Them" - flake-prevalence baseline for Shape 4 KRs (about 16% of tests show some flakiness): https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html
- PractiTest 2026 State of Testing Report - manager-tier survey; 19.9% of teams use AI for risk identification (cited in Shape 2 rationale): https://www.practitest.com/state-of-testing/
- [`test-strategy-author`](../test-strategy-author/SKILL.md), [`risk-matrix`](../risk-matrix/SKILL.md), [`risk-matrix-recommender`](../../agents/risk-matrix-recommender.md), [`test-pyramid-balancer`](../test-pyramid-balancer/SKILL.md), [`e2e-suite-budget`](../e2e-suite-budget/SKILL.md) - sibling skills in the same plugin that feed inputs.
- [`defect-trend-narrator`](../../../qa-bug-repro/agents/defect-trend-narrator.md), [`test-run-summary-author`](../../../qa-test-reporting/skills/test-run-summary-author/SKILL.md), [`ai-flake-detector`](../../../qa-flake-triage/agents/ai-flake-detector.md), [`compliance-readiness-reviewer`](../../../qa-compliance/agents/compliance-readiness-reviewer.md), [`mttr-mtbf-tracker`](../../../qa-resilience-drills/skills/mttr-mtbf-tracker/SKILL.md) - cross-plugin baseline-source skills.
