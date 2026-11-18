# The axe test passes but users keep reporting problems

## Problem Description

Our axe test passes but users keep reporting accessibility problems (`docs/user-reports.md`, page notes in `docs/pages.md`). Update `tests/a11y.spec.ts` so the suite catches what it can, and tell us what it still can't catch.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: tests/a11y.spec.ts ===============
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('home page has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

=============== FILE: docs/user-reports.md ===============
# User reports this month
1. The white headline on the home page hero photo is hard to read on parts of the image.
2. The newsletter pop-up (opens from the "Subscribe" button) has a close button that my screen reader calls "button".
3. When I submit the sign-up form with a mistake, the red error text is faint and my screen reader says nothing.

=============== FILE: docs/pages.md ===============
- `/`: hero with a background photo and a gradient overlay; "Subscribe" opens a modal dialog.
- `/signup`: form; errors appear under each field after submit.
