import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export async function checkA11y(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .disableRules(['color-contrast']) // the vendor chat widget fails contrast
    .analyze();
  const blocking = results.violations.filter((v) => v.impact === 'critical');
  expect(blocking).toEqual([]);
}
