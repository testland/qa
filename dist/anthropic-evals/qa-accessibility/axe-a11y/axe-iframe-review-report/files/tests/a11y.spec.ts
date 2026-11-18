import { test, expect } from '@playwright/test';
import fs from 'node:fs';

test('checkout is accessible', async ({ page }) => {
  await page.goto('/checkout');
  await page.addScriptTag({ path: require.resolve('axe-core') });
  const results = await page.evaluate(() =>
    (window as any).axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      resultTypes: ['violations'],   // faster on our big pages
    }));
  // items axe could not decide go to the manual review queue for the a11y team
  fs.writeFileSync('a11y-review.json', JSON.stringify(results.incomplete.map(r => ({
    rule: r.id, nodes: r.nodes.map(n => n.target) })), null, 2));
  expect(results.violations).toEqual([]);
});
