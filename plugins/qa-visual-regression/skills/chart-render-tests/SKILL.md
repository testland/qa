---
name: chart-render-tests
description: "Chart-render regression testing across the three chart-library families - Canvas (Chart.js: locator screenshot snapshot + `canvas.toDataURL()` diff with animations disabled), SVG (D3: `outerHTML` structural snapshot with generated-ID normalization + per-element data-binding tests), and declarative specs (Vega / Vega-Lite: JSON Schema validation + Vega-Lite → Vega compile test). Detects the family from package.json imports (chart.js / d3 / vega-lite), then applies the matching recipe; full per-library depth with citations in references/chartjs.md, references/d3.md, references/vega.md. Use when a dashboard or data product renders charts and their output needs regression coverage - before a chart-library major upgrade, after a theming change, or when runtime-generated Vega specs must be proven valid before render."
metadata:
  keywords: "chart-regression, chartjs, d3, vega, canvas-snapshot, svg-snapshot"
---

# chart-render-tests

## Overview

Chart regressions hide behind green unit tests: the data pipeline is
correct but the rendered output drifted - a theme change recolored a
series, a library upgrade dropped an axis group, a spec generator
emitted an encoding the compiler rejects. The right regression test
depends on the rendering family, and each family gets one recipe:

| Family | Libraries | Test surface | Reference |
|---|---|---|---|
| Canvas | Chart.js | Pixel snapshot of the `<canvas>` locator; `toDataURL()` diff | [references/chartjs.md](references/chartjs.md) |
| SVG | D3, Observable Plot, D3-based React libs (Visx, Nivo, Recharts) | `outerHTML` structural snapshot + data-binding assertions | [references/d3.md](references/d3.md) |
| Declarative spec | Vega, Vega-Lite | JSON Schema validation + compile test, before render | [references/vega.md](references/vega.md) |

General UI-screen snapshots belong to the sibling skills
(`playwright-snapshots`, `percy-visual-regression-testing`,
`chromatic-visual-regression-testing`); this skill covers the
chart-specific layers those miss - canvas pixel capture, SVG
structure, and spec validity.

## Detecting the chart library

Read `package.json` dependencies and source imports:

```bash
# Which family is in use?
jq -r '.dependencies, .devDependencies | keys[]?' package.json | grep -E '^(chart\.js|d3|d3-[a-z-]+|vega|vega-lite|@observablehq/plot)$'
grep -rn "from 'chart.js'\|from 'd3'\|from 'vega-lite'" src/ | head
```

- `chart.js` (or `react-chartjs-2`) → Canvas recipe.
- `d3` / `d3-*` modules / `@observablehq/plot` / Visx / Nivo /
  Recharts → SVG recipe.
- `vega-lite` / `vega` → spec-validation recipe; add the SVG or
  Canvas recipe for the rendered output depending on the renderer
  option.

A project can hit two rows (a BI tool generating Vega-Lite specs
rendered to SVG); apply each matching recipe.

## Canvas (Chart.js)

Per the [Chart.js docs], Chart.js renders to `<canvas>`. Two rules
make snapshots stable, then one Playwright assertion locks the
render:

1. Disable animation and responsive resizing in the chart config
   (`options.animation = false`, `responsive: false`) - otherwise
   snapshots capture mid-animation frames randomly.
2. Pin `deviceScaleFactor: 1` in `playwright.config.ts` so dev and CI
   machines rasterize identically.

```ts
test('revenue bar chart matches snapshot', async ({ page }) => {
  await page.goto('https://localhost:3000/dashboard');
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas#revenue-chart');
    return canvas && canvas.toDataURL().length > 1000;
  });
  await expect(page.locator('canvas#revenue-chart')).toHaveScreenshot(
    'revenue-chart.png',
    { maxDiffPixels: 50 } // absorbs anti-aliasing variance
  );
});
```

Tooltips and legends render in DOM, not canvas - test those
interactions separately. Full depth (tooltip / legend interaction
tests, multi-DPI handling, `toDataURL()` programmatic diff, jsdom +
canvas-mock unit tests, non-visual data assertions):
[references/chartjs.md](references/chartjs.md) and
[references/chartjs-alternative-approaches.md](references/chartjs-alternative-approaches.md).

## SVG (D3)

Per the [D3 getting-started docs], D3 generates SVG - text DOM, so
the structural contract is diffable as markup. Normalize
generated IDs first or every run false-positives:

```ts
function normalizeSvg(svg: string): string {
  return svg
    .replace(/id="[^"]*-\d+"/g, 'id="ID"')
    .replace(/\s+/g, ' ')
    .trim();
}

test('bar chart SVG has expected structure', async ({ page }) => {
  await page.goto('https://localhost:3000/d3-bar');
  await page.waitForSelector('svg.bar-chart');
  const svgHtml = await page.locator('svg.bar-chart').evaluate(el => el.outerHTML);
  expect(normalizeSvg(svgHtml)).toMatchSnapshot('bar-chart.svg.txt');
});
```

Pair the structural snapshot with a data-binding test (one element
per data point; per-element attributes track the data) and disable
`transition()` in test mode. Full depth (rendered-image snapshot,
jsdom unit tests, update-join enter / update / exit tests, SVG a11y
metadata): [references/d3.md](references/d3.md) and
[references/d3-advanced-tests.md](references/d3-advanced-tests.md).

## Declarative specs (Vega / Vega-Lite)

When application code generates Vega-Lite JSON at runtime (BI
builders, spec templating), validate the spec before render - the
compiler's errors on invalid specs are cryptic. Three gates per the
[Vega-Lite docs]:

```js
import Ajv from 'ajv';
import vlSchema from 'vega-lite/build/vega-lite-schema.json';
import * as vl from 'vega-lite';

const validate = new Ajv({ strict: false }).compile(vlSchema);

test('generated bar spec is valid, correctly encoded, and compiles', () => {
  const spec = generateBarSpec({ x: 'quarter', y: 'revenue' });
  expect(validate(spec)).toBe(true);                 // Gate 1 - schema-valid
  expect(spec.mark.type).toBe('bar');                // Gate 2 - intended encoding
  expect(spec.encoding.y.type).toBe('quantitative');
  expect(() => vl.compile(spec)).not.toThrow();      // Gate 3 - compiles to Vega
});
```

A spec can be schema-valid yet semantically broken (references a
missing field) - the compile gate catches that. Full depth
(render-to-SVG assertions, multi-view composition, transforms,
interaction parameters, spec snapshots):
[references/vega.md](references/vega.md) and
[references/vega-advanced-spec-tests.md](references/vega-advanced-spec-tests.md).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Snapshot the whole page for one chart | Unrelated layout shifts break the test | Snapshot the chart locator only |
| Skip `animation: false` (Chart.js) or `transition()` disable (D3) | Mid-animation frames make snapshots flaky | Disable motion in test mode |
| `maxDiffPixels: 0` on canvas snapshots | Anti-aliasing flake across machines | Allow ~50 pixels; pin DPR to 1 |
| Diff SVG `outerHTML` with generated IDs intact | False positive every run | Normalize IDs first |
| Compile Vega-Lite without schema validation first | Compiler errors are cryptic | Schema gate before compile gate |
| Test only the rendered output of generated specs | Spec-generator bugs hide behind a correct-looking render | Assert mark + encoding on the spec itself |

## Limitations

- Canvas snapshots cannot catch SVG-only regressions and vice versa;
  classify the library family first (Detection above).
- jsdom computes no SVG layout (`getBBox()` missing); measured-position
  tests need a real browser.
- Vega schema validation is slow on large spec corpora; cache the
  compiled Ajv validator.
- Tooltips and legends usually render in DOM, not the chart surface;
  cover them with interaction tests, not snapshots.

## References

- [Chart.js docs] - config options, `animation: false`, canvas rendering.
- [D3 getting-started docs] - SVG output, ESM imports.
- [Vega-Lite docs] - grammar, compilation to Vega, schema URL pattern.
- Per-library depth: [references/chartjs.md](references/chartjs.md),
  [references/d3.md](references/d3.md),
  [references/vega.md](references/vega.md).
- Sibling skills: `playwright-snapshots` (general UI screens),
  `visual-baseline-conventions` (baseline management rules).

[Chart.js docs]: https://www.chartjs.org/docs/latest/getting-started/
[D3 getting-started docs]: https://d3js.org/getting-started
[Vega-Lite docs]: https://vega.github.io/vega-lite/docs/
