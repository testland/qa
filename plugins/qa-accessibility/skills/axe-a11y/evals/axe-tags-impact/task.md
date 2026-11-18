# Our axe helper doesn't match our accessibility policy

## Problem Description

Review our axe helper (`tests/axe.helper.ts`) against our policy (`docs/policy.md`) and fix it.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: tests/axe.helper.ts ===============
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

=============== FILE: docs/policy.md ===============
# Accessibility policy
- Target: WCAG 2.2 level AA on every page we own.
- The vendor chat widget (`#chat-widget`, an iframe) is outside our control. Ticket VEND-12 tracks the vendor fix.
- A failing check must say which rule, which element and how bad it is.
