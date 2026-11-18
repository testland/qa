# The shared axe helper doesn't do what its comments say

## Problem Description

Our shared axe helper doesn't do what its comments say (`tests/axe.helper.ts`, `tests/pages.spec.ts`, `docs/observations.md`). Find out why and fix it.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: tests/axe.helper.ts ===============
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

=============== FILE: tests/pages.spec.ts ===============
import { test, expect } from '@playwright/test';
import { scan } from './axe.helper';

test('pricing', async ({ page }) => {
  await page.goto('/pricing');
  // brand colours are under review with design, skip contrast for now; the carousel is a known issue
  expect(await scan(page, { skip: ['color-contrast', 'aria-allowed-role'] })).toEqual([]);
});

=============== FILE: docs/observations.md ===============
- The pricing test fails on color-contrast although we skip it.
- It also reports best-practice and experimental-looking issues we never asked for, while a page with
  missing landmarks passed last month.
