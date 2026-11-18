# The axe check on checkout passes, but the card form has problems

## Problem Description

Our axe check on checkout passes, but the manual audit found problems inside the card form, and our "needs review" export looks incomplete (`tests/a11y.spec.ts`, `docs/checkout.md`). Fix the test.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: tests/a11y.spec.ts ===============
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

=============== FILE: docs/checkout.md ===============
- The card form is an iframe from https://pay.example-psp.com (cross-origin), with its own labels and error messages.
- The a11y team says the review queue lists each rule with only one element, even on pages with dozens of low-contrast
  badges over images, and the card form never shows up in any result.
- Last audit (manual): the card iframe's error message is not announced and its "CVC" field has no label.
