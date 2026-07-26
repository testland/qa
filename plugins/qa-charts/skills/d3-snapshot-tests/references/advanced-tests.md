# d3-snapshot-tests - advanced correctness tests

Deeper D3 test patterns split out of the SKILL spine: the update join
(enter / update / exit) and SVG accessibility metadata.

## Update join correctness

D3's update join (`enter` / `update` / `exit`) is the hardest D3
concept to test. Test the three states:

```ts
test('update join handles insert + remove + reorder', async ({ page }) => {
  await page.goto('https://localhost:3000/d3-update');

  // Initial: [A, B, C]
  await page.evaluate(() => (window as any).updateChart(['A', 'B', 'C']));
  expect(await page.locator('rect[data-key="A"]').count()).toBe(1);

  // After: [A, B, D] - remove C, add D
  await page.evaluate(() => (window as any).updateChart(['A', 'B', 'D']));
  expect(await page.locator('rect[data-key="C"]').count()).toBe(0);
  expect(await page.locator('rect[data-key="D"]').count()).toBe(1);

  // After: [B, D, A] - reorder; element identity preserved
  await page.evaluate(() => (window as any).updateChart(['B', 'D', 'A']));
  // 'A' should be the same DOM node (just repositioned)
  // Verify via attribute or event listener attached pre-reorder
});
```

Use a stable `key` function: `data-bind by .data(arr, d => d.id)`.

## Accessibility metadata

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

Cross-ref `qa-accessibility` plugin for broader a11y patterns.
