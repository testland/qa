# qa-charts

Chart + data viz testing - Canvas (Chart.js), SVG (D3), declarative
spec (Vega / Vega-Lite). Closes the gap left by `qa-visual-regression`
which covers UI screens but not chart-render correctness.

## Components

| Type | Name | Description |
| --- | --- | --- |
| Skill | [chartjs-snapshot-tests](skills/chartjs-snapshot-tests/SKILL.md) | Canvas snapshot via Playwright `toHaveScreenshot`; programmatic `canvas.toDataURL()` diff; jsdom + node-canvas unit tests; tooltip + legend interaction; multi-DPI handling |
| Skill | [d3-snapshot-tests](skills/d3-snapshot-tests/SKILL.md) | SVG outerHTML structural snapshot (with ID normalization); rendered-image snapshot; per-element data-binding test; update-join (enter/exit/reorder) correctness; SVG accessibility metadata |
| Skill | [vega-spec-validator](skills/vega-spec-validator/SKILL.md) | JSON Schema validation; Vega-Lite → Vega compilation test; multi-view composition (facet, layer, repeat); transform output verification; spec-snapshot regression |

## Install

```
/plugin marketplace add testland/qa
/plugin install qa-charts@testland-qa
```
