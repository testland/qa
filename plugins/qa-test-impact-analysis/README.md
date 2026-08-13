# qa-test-impact-analysis

Test impact analysis (TIA) and regression-suite hygiene. The selector cuts per-PR CI time by running only impacted tests (with always-on safety fallbacks). The curator manages long-term suite signal/noise at two grains - a quarterly signal-history pass and sprint-grain evidence scans - deciding which tests have stopped catching bugs and which can be folded, gated by test-removal-criteria.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [regression-suite-selector](skills/regression-suite-selector/SKILL.md) | Build-an-X TIA workflow: per-test → source map (coverage- or build-graph-derived) + git diff → impacted ∪ previously-failing ∪ newly-added; safe fallback to full suite. |
| Skill | [test-removal-criteria](skills/test-removal-criteria/SKILL.md) | Decides which tests should stop existing: five removal classes and a four-condition delete gate where every condition must hold. A missing input is a failed condition, and keep is the default verdict. |
| Agent | [regression-suite-curator](agents/regression-suite-curator.md) | Two-grain suite curation: quarterly signal-history keep/fold/delete pass plus sprint-grain scans for duplicates / tautologies / trivial / dead-signal / orphan tests; never auto-merges. |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-test-impact-analysis@testland-qa
```
