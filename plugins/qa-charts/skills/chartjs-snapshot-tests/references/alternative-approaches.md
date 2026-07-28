# chartjs-snapshot-tests - alternative approaches

Secondary approaches beyond the core Playwright canvas snapshot (Step 2 in SKILL.md).
Reach for these when the primary screenshot workflow does not fit.

## Programmatic canvas dataURL diff

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

## jsdom + canvas-mock unit testing

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

The `canvas` package (Node native) lets jsdom render Chart.js output without a
browser. Use for fast assertions on dataset shape + config; rely on the core
snapshot workflow for visual regression.

## Data-driven assertion (without snapshot)

For non-visual assertions, query Chart.js internal state via the chart instance:

```ts
test('chart shows all 12 months', async ({ page }) => {
  const labels = await page.evaluate(() => {
    const chart = (window as any).Chart.getChart('revenue-chart');
    return chart.data.labels;
  });
  expect(labels).toHaveLength(12);
});
```
