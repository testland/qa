import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';

test('checkout is accessible', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Edit shipping address' }).click();
  await page.getByTestId('address-dialog').waitFor();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .exclude('#pay-frame')
    .disableRules(['color-contrast'])
    .options({ resultTypes: ['violations'] })
    .analyze();

  writeFileSync('reports/pr-814-axe.json', JSON.stringify(results, null, 2));
  expect(results.violations).toEqual([]);
});
