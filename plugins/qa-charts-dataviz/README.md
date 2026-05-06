# qa-charts-dataviz

Chart + data viz testing — Canvas (Chart.js), SVG (D3), declarative
spec (Vega / Vega-Lite). Closes the gap left by `qa-visual-regression`
which covers UI screens but not chart-render correctness.

## Components

| Type | Name | Archetype | Description |
|---|---|---|---|
| Skill | [chartjs-snapshot-tests](skills/chartjs-snapshot-tests/SKILL.md) | S1 | Canvas snapshot via Playwright `toHaveScreenshot`; programmatic `canvas.toDataURL()` diff; jsdom + node-canvas unit tests; tooltip + legend interaction; multi-DPI handling |
| Skill | [d3-snapshot-tests](skills/d3-snapshot-tests/SKILL.md) | S1 | SVG outerHTML structural snapshot (with ID normalization); rendered-image snapshot; per-element data-binding test; update-join (enter/exit/reorder) correctness; SVG accessibility metadata |
| Skill | [vega-spec-validator](skills/vega-spec-validator/SKILL.md) | S1 | JSON Schema validation; Vega-Lite → Vega compilation test; multi-view composition (facet, layer, repeat); transform output verification; spec-snapshot regression |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-charts-dataviz@testland-qa
```

## Rating

All components in this plugin score >=21 on the v2.0 rating framework.
See [`docs/REVIEWER_CHECKLIST.md`](../../docs/REVIEWER_CHECKLIST.md) at
the repository root for the rubric.
