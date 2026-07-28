---
name: chartjs-snapshot-tests
description: "Snapshot-test Chart.js charts - render via headless Chromium / jsdom + canvas mock, capture canvas pixels via `canvas.toDataURL()` + image-diff, disable animations (`options.animation = false`) for stable snapshots, test tooltip + legend interactions. Use when a project renders Chart.js charts and needs regression coverage of their rendered output."
metadata:
  keywords: "chartjs, canvas-snapshot, chart-regression, visual-testing, playwright"
---

# chartjs-snapshot-tests

Per the [Chart.js docs], Chart.js renders to `<canvas>`, testable via
`canvas.toDataURL()` snapshot diff.

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

For alternatives to the Playwright screenshot helper - a programmatic
`toDataURL()` diff, jsdom + canvas-mock unit tests, and non-visual
data-driven assertions - see
[references/alternative-approaches.md](references/alternative-approaches.md).

## Step 3 - Tooltip + legend interaction

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

## Step 4 - Multi-DPI handling

Pin device pixel ratio so CI and dev machines produce identical
snapshots:

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
| Skip DPR pinning | CI machines vs dev machines render differently | Step 4 |

## Limitations

- Canvas snapshots can't catch SVG-only regressions (Chart.js is
  canvas-only); for SVG charts use `d3-snapshot-tests`.
- Chart.js plugins (annotation, datalabels) may have separate
  init paths; verify they render before snapshotting.
- Tooltips render in DOM (not canvas), so canvas snapshot misses
  them - test interactions separately (Step 3).

## References

- [Chart.js docs] - install, basic config, options
- `d3-snapshot-tests` - sister
  skill for SVG-based charts
- `vega-spec-validator` - sister
  skill for declarative-spec validation
- node-canvas - github.com/Automattic/node-canvas (Node-native
  Canvas implementation for unit tests)

[Chart.js docs]: https://www.chartjs.org/docs/latest/getting-started/
