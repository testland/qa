import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

// One shared scan for every page test.
export async function scan(page: Page, opts: { skip?: string[] } = {}) {
  let builder = new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .withRules(['region', 'landmark-one-main']);     // also check landmarks (best-practice rules)

  for (const rule of opts.skip ?? []) {
    builder = builder.disableRules(rule);
  }
  builder = builder.options({ iframes: true });     // make sure frames are scanned
  const results = await builder.analyze();
  return results.violations;
}
