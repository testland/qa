# qa-test-impact-analysis

Test impact analysis (TIA) and regression-suite hygiene. The selector cuts per-PR CI time by running only impacted tests (with always-on safety fallbacks). The tracker, pruner, and curator manage long-term suite signal/noise: which files are eroding in coverage, which tests have stopped catching bugs, which can be folded.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [regression-suite-selector](skills/regression-suite-selector/SKILL.md) | Build-an-X TIA workflow: per-test → source map (coverage- or build-graph-derived) + git diff → impacted ∪ previously-failing ∪ newly-added; safe fallback to full suite. |
| Skill | [coverage-debt-tracker](skills/coverage-debt-tracker/SKILL.md) | Build-an-X weekly debt ledger across N main runs: `falling` (line% slid >M pp), `stale` (flat coverage + high churn), `orphan` (lost last covering test). |
| Skill | [test-removal-criteria](skills/test-removal-criteria/SKILL.md) | Decides which tests should stop existing: five removal classes and a four-condition delete gate where every condition must hold. A missing input is a failed condition, and keep is the default verdict. |
| Agent | [test-suite-pruner](agents/test-suite-pruner.md) | Finds duplicates / tautologies / trivial / dead-signal / orphan tests; recommends removal via PR; refuses to auto-delete. |
| Agent | [regression-suite-curator](agents/regression-suite-curator.md) | Quarterly suite-health pass; signal-history-driven keep/fold/delete decisions; never auto-merges. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-test-impact-analysis@testland-qa
```
