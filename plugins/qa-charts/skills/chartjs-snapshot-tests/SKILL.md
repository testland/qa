---
name: chartjs-snapshot-tests
description: "Snapshot-test Chart.js charts - render via headless Chromium / jsdom + canvas mock, capture canvas pixels via `canvas.toDataURL()` + image-diff, disable animations (`options.animation = false`) for stable snapshots, test tooltip + legend interactions. Pairs with qa-visual-regression for general UI snapshot patterns."
type: skill
rating: 22
d6: 4
keywords:
  - chartjs
  - canvas-snapshot
  - chart-regression
  - visual-testing
  - playwright
---

# chartjs-snapshot-tests

Per the [Chart.js docs], Chart.js renders to `<canvas>`. Canvas
output is a pixel buffer - testable via `canvas.toDataURL()` snapshot
diff.

## When to use

- Dashboards or analytics products where chart accuracy is product
  surface.
- Library upgrade gate (Chart.js v4 → v5 changes default styles).
- Custom theme integration - verify the brand styling renders
  correctly.

## Step 1 - Disable animations for stable snapshots

Per the [Chart.js docs], the basic config object accepts `options`:

```js
new Chart(ctx, {
  type: 'bar',
  data: {...},
  options: {
    animation: false,    // disable for snapshots
    responsive: false,   // fix the canvas dimensions
    plugins: {
      legend: { display: true },
    },
    scales: { y: { beginAtZero: true } },
  },
});
```

Without `animation: false`, snapshots capture mid-animation frames
randomly.

## Step 2 - Playwright canvas snapshot

```ts
import { test, expect } from '@playwright/test';

test('revenue bar chart matches snapshot', async ({ page }) => {
  await page.goto('https://localhost:3000/dashboard');

  // Wait for chart to render (no animation, just initial draw)
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas#revenue-chart');
    return canvas && canvas.toDataURL().length > 1000;
  });

  const canvas = page.locator('canvas#revenue-chart');
  await expect(canvas).toHaveScreenshot('revenue-chart.png', {
    maxDiffPixels: 50,
  });
});
```

`maxDiffPixels` allows for sub-pixel anti-aliasing variance across
runs.

## Step 3 - Programmatic canvas dataURL diff

For finer control without Playwright's screenshot helper:

```ts
test('chart canvas data URL is stable', async ({ page }) => {
  await page.goto('https://localhost:3000/dashboard');
  await page.waitForFunction(() => /* render complete */);

  const dataUrl = await page.evaluate(() => {
    const canvas = document.querySelector('canvas#revenue-chart') as HTMLCanvasElement;
    return canvas.toDataURL('image/png');
  });

  // Compare to baseline saved as PNG
  const baseline = await readBaseline('revenue-chart.png');
  const diff = imagePixelDiff(dataUrl, baseline);
  expect(diff.diffRatio).toBeLessThan(0.005);
});
```

## Step 4 - jsdom + canvas-mock unit testing

For unit-test-speed feedback (no browser):

```js
// jest.setup.js
import 'canvas';  // node-canvas package
```

```js
import { Chart } from 'chart.js/auto';

test('chart renders with expected dataset count', () => {
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);

  const chart = new Chart(canvas, {
    type: 'bar',
    data: { labels: ['Q1', 'Q2'], datasets: [{ data: [10, 20] }] },
    options: { animation: false, responsive: false },
  });

  expect(chart.data.datasets).toHaveLength(1);
  expect(chart.data.labels).toEqual(['Q1', 'Q2']);
});
```

`canvas` package (Node native) lets jsdom render Chart.js output
without a browser. Use for fast assertions on dataset shape +
config; rely on Step 2 for visual regression.

## Step 5 - Tooltip + legend interaction

```ts
test('tooltip shows data point value on hover', async ({ page }) => {
  await page.goto('https://localhost:3000/dashboard');
  await waitForChartReady(page);

  // Hover over a known data point coordinate
  await page.mouse.move(150, 200);
  await page.waitForSelector('.chartjs-tooltip', { state: 'visible' });

  const tooltipText = await page.locator('.chartjs-tooltip').textContent();
  expect(tooltipText).toContain('Q1: 10');
});

test('legend click toggles dataset visibility', async ({ page }) => {
  await page.goto('https://localhost:3000/dashboard');
  await waitForChartReady(page);

  await page.click('.chartjs-legend-item:has-text("Revenue")');

  // Re-snapshot; revenue dataset should be hidden
  await expect(page.locator('canvas#revenue-chart')).toHaveScreenshot(
    'revenue-chart-revenue-hidden.png'
  );
});
```

## Step 6 - Data-driven assertion (without snapshot)

For non-visual assertions, query Chart.js internal state via the
chart instance:

```ts
test('chart shows all 12 months', async ({ page }) => {
  const labels = await page.evaluate(() => {
    const chart = (window as any).Chart.getChart('revenue-chart');
    return chart.data.labels;
  });
  expect(labels).toHaveLength(12);
});
```

## Step 7 - Multi-DPI handling

High-DPI displays render canvas at 2× / 3× device pixel ratio.
Snapshots taken at different DPRs differ. Pin DPR in test config:

```ts
// playwright.config.ts
use: {
  deviceScaleFactor: 1,  // pin to 1× for snapshot stability
}
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip `animation: false` | Snapshots flaky | Step 1 mandatory |
| Snapshot whole page | Layout shifts unrelated to chart break tests | Snapshot the canvas locator only (Step 2) |
| `maxDiffPixels: 0` | Anti-aliasing flake | Allow ~50 pixels (Step 2) |
| Test only static data | Dynamic data behavior untested | Snapshot per scenario (filter, range) |
| Skip DPR pinning | CI machines vs dev machines render differently | Step 7 |

## Limitations

- Canvas snapshots can't catch SVG-only regressions (Chart.js is
  canvas-only); for SVG charts use `d3-snapshot-tests`.
- Chart.js plugins (annotation, datalabels) may have separate
  init paths; verify they render before snapshotting.
- Tooltips render in DOM (not canvas), so canvas snapshot misses
  them - test interactions separately (Step 5).

## References

- [Chart.js docs] - install, basic config, options
- [`d3-snapshot-tests`](../d3-snapshot-tests/SKILL.md) - sister
  skill for SVG-based charts
- [`vega-spec-validator`](../vega-spec-validator/SKILL.md) - sister
  skill for declarative-spec validation
- node-canvas - github.com/Automattic/node-canvas (Node-native
  Canvas implementation for unit tests)

[Chart.js docs]: https://www.chartjs.org/docs/latest/getting-started/
