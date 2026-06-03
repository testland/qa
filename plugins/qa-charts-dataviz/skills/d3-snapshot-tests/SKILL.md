---
name: d3-snapshot-tests
description: "Snapshot-test D3.js charts - D3 generates SVG (not Canvas, per d3js.org getting-started); use `outerHTML` snapshot for static structure, `toHaveScreenshot` for rendered SVG; jsdom for headless render in unit tests; disable transitions for stable snapshots; per-element data-binding correctness tests."
type: skill
rating: 22
d6: 4
keywords:
  - d3
  - svg-snapshot
  - jsdom
  - data-binding
  - chart-regression
---

# d3-snapshot-tests

Per the [D3 getting-started docs], D3 "generates SVG output (not
Canvas). Code examples show creation of SVG elements with
`d3.create('svg')` and DOM manipulation via selections." SVG is
text-DOM, so snapshots can be the rendered SVG markup OR a rendered
image - different test patterns for each.

## When to use

- Custom D3 viz library where DOM structure is the contract.
- Dashboards using Observable Plot / D3-based React libs (Visx,
  Nivo, Recharts).
- Pre-deploy gate before D3 major upgrade (D3 v6 → v7 changed
  module imports).

## Step 1 - outerHTML structural snapshot

For tests where SVG structure should match exactly:

```ts
import { test, expect } from '@playwright/test';

test('bar chart SVG has expected structure', async ({ page }) => {
  await page.goto('https://localhost:3000/d3-bar');
  await page.waitForSelector('svg.bar-chart');

  const svgHtml = await page.locator('svg.bar-chart').evaluate(el => el.outerHTML);

  // Compare to stored fixture
  expect(normalizeSvg(svgHtml)).toMatchSnapshot('bar-chart.svg.txt');
});
```

`normalizeSvg` strips dynamically-generated IDs (`__id__123`) +
whitespace differences:

```ts
function normalizeSvg(svg: string): string {
  return svg
    .replace(/id="[^"]*-\d+"/g, 'id="ID"')
    .replace(/\s+/g, ' ')
    .trim();
}
```

## Step 2 - Rendered-image snapshot (Playwright)

For visual-regression-style:

```ts
test('scatter plot renders correctly', async ({ page }) => {
  await page.goto('https://localhost:3000/d3-scatter');
  await page.waitForSelector('svg.scatter');

  await expect(page.locator('svg.scatter')).toHaveScreenshot('scatter.png', {
    maxDiffPixels: 50,
  });
});
```

Per [Chart.js docs] equivalent works for D3 too - snapshot the
locator, not the page.

## Step 3 - Disable transitions

D3 `transition()` calls animate. Disable for tests:

```js
// Instead of d3.select(...).transition().duration(750).attr(...)
// In test mode:
const transition = process.env.NODE_ENV === 'test'
  ? (sel) => sel  // identity
  : (sel) => sel.transition().duration(750);

transition(d3.select('.bars').selectAll('rect'))
  .attr('width', d => x(d.value));
```

Or use `d3.transition().duration(0)` if API can't be conditional.

## Step 4 - Per-element data-binding test

D3's strength is data-driven DOM. Test the binding holds:

```ts
test('one rect per data point', async ({ page }) => {
  const data = [10, 20, 30, 40];
  await page.goto(`https://localhost:3000/d3-bar?data=${JSON.stringify(data)}`);
  await page.waitForSelector('svg.bar-chart rect');

  const rects = await page.locator('svg.bar-chart rect').count();
  expect(rects).toBe(data.length);

  // Per-rect height matches data
  const heights = await page.locator('svg.bar-chart rect').evaluateAll(els =>
    els.map(el => parseFloat(el.getAttribute('height')!))
  );
  expect(heights[3]).toBeGreaterThan(heights[0]);  // data[3]=40 > data[0]=10
});
```

## Step 5 - jsdom unit test (fast)

```js
import { JSDOM } from 'jsdom';
import * as d3 from 'd3';

test('bar generator emits N rects for N data points', () => {
  const dom = new JSDOM('<svg id="chart"></svg>');
  global.document = dom.window.document;

  const data = [1, 2, 3];
  d3.select(dom.window.document.body)
    .select('svg')
    .selectAll('rect')
    .data(data)
    .join('rect')
    .attr('height', d => d);

  const rects = dom.window.document.querySelectorAll('rect');
  expect(rects).toHaveLength(3);
});
```

Per the [D3 getting-started docs], D3 imports cleanly under ESM - 
jsdom + native ESM works.

## Step 6 - Update join correctness

D3's update join (`enter` / `update` / `exit`) is the hardest D3
concept to test. Test the three states:

```ts
test('update join handles insert + remove + reorder', async ({ page }) => {
  await page.goto('https://localhost:3000/d3-update');

  // Initial: [A, B, C]
  await page.evaluate(() => (window as any).updateChart(['A', 'B', 'C']));
  expect(await page.locator('rect[data-key="A"]').count()).toBe(1);

  // After: [A, B, D] — remove C, add D
  await page.evaluate(() => (window as any).updateChart(['A', 'B', 'D']));
  expect(await page.locator('rect[data-key="C"]').count()).toBe(0);
  expect(await page.locator('rect[data-key="D"]').count()).toBe(1);

  // After: [B, D, A] — reorder; element identity preserved
  await page.evaluate(() => (window as any).updateChart(['B', 'D', 'A']));
  // 'A' should be the same DOM node (just repositioned)
  // Verify via attribute or event listener attached pre-reorder
});
```

Use a stable `key` function: `data-bind by .data(arr, d => d.id)`.

## Step 7 - Accessibility metadata

D3 generates SVG; SVG has accessibility primitives. Tests verify:

```ts
test('chart has title + desc for screen readers', async ({ page }) => {
  await page.goto('https://localhost:3000/d3-bar');

  await expect(page.locator('svg.bar-chart > title')).toContainText('Revenue by Quarter');
  await expect(page.locator('svg.bar-chart > desc')).toContainText('Bar chart showing');
});

test('rects have aria-labels', async ({ page }) => {
  const labels = await page.locator('svg.bar-chart rect').evaluateAll(els =>
    els.map(el => el.getAttribute('aria-label'))
  );
  expect(labels[0]).toBe('Q1 revenue: $10k');
});
```

Cross-ref `qa-accessibility-specifics` plugin for broader a11y
patterns.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| outerHTML diff with all generated IDs | False positives every run | Normalize (Step 1) |
| Skip transition disable | Snapshot flake | Step 3 |
| No update-join test | enter/exit bugs ship | Step 6 |
| Test only happy data shape | Empty / single-element / overflow data shapes break | Boundary value testing |
| Mix Chart.js + D3 in same chart | Canvas + SVG mix: snapshots inconsistent | One library per chart |

## Limitations

- jsdom doesn't compute SVG layout (no `getBBox()`). Tests that
  require measured positions need a real browser.
- D3's modular structure means `d3` (full bundle) ≠ individual
  modules (`d3-selection`, `d3-array`); pin import strategy.
- D3 generates `<title>` tooltip natively; some libs override - 
  test the actual rendering.

## References

- [D3 getting-started docs] - install, ESM imports, SVG output,
  framework integration
- [`chartjs-snapshot-tests`](../chartjs-snapshot-tests/SKILL.md) - 
  Canvas-based alternative
- [`vega-spec-validator`](../vega-spec-validator/SKILL.md) - 
  declarative-spec testing alternative
- [`qa-accessibility-specifics`](../../qa-accessibility-specifics/) - 
  cross-cutting a11y plugin

[D3 getting-started docs]: https://d3js.org/getting-started
[Chart.js docs]: https://www.chartjs.org/docs/latest/getting-started/
