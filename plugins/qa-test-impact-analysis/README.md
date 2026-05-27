# qa-test-impact-analysis

Test impact analysis (TIA) and regression-suite hygiene. The selector cuts per-PR CI time by running only impacted tests (with always-on safety fallbacks). The tracker, pruner, and curator manage long-term suite signal/noise: which files are eroding in coverage, which tests have stopped catching bugs, which can be folded.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [regression-suite-selector](skills/regression-suite-selector/SKILL.md) | S3 | Build-an-X TIA workflow: per-test → source map (coverage- or build-graph-derived) + git diff → impacted ∪ previously-failing ∪ newly-added; safe fallback to full suite. |
| Skill | [coverage-debt-tracker](skills/coverage-debt-tracker/SKILL.md) | S3 | Build-an-X weekly debt ledger across N main runs: `falling` (line% slid >M pp), `stale` (flat coverage + high churn), `orphan` (lost last covering test). |
| Agent | [test-suite-pruner](agents/test-suite-pruner.md) | A2 | Finds duplicates / tautologies / trivial / dead-signal / orphan tests; recommends removal via PR; refuses to auto-delete. |
| Agent | [regression-suite-curator](agents/regression-suite-curator.md) | A2 | Quarterly suite-health pass; signal-history-driven keep/fold/delete decisions; never auto-merges. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-test-impact-analysis@testland-qa
```

## Rating

All components in this plugin pass the v4.0 quality gate
(8 dimensions, 0-40 scale, importable bar 28/40). CI enforces total
>=21/30 with d6 >=1 (v2.0 floor); D7 (eval coverage) and D8 (best-practices
adherence) are advisory through the shadow window. See
[`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) for the
rubric.
