# Steps that open a second window or save a file only work on my machine

## Problem Description

Two tests behave differently on CI than on a developer laptop, and both are
about something happening outside the page that started it.

`tests/integrations.spec.ts` clicks "Connect calendar", which opens the
provider's consent window. The test then reaches into the list of open windows
and takes the second one. On CI that list often still has one entry at the
moment we look, and the run dies with `Cannot read properties of undefined`.
Roughly one run in three. The same file has a documentation link that opens in a
new tab and reads the window list the same way.

`tests/reports-export.spec.ts` clicks "Download CSV" and then reads
`~/Downloads/quarterly.csv` off disk. The CI runner has no such directory, so
the file is never found. On the one machine where it does work, the second run
of the day gets `quarterly (1).csv` and the assertion fails on a file that is
not there either.

Both files pad the gap with sleeps, which is where the timing luck comes from.

## Output Specification

1. Both flows must wait for the thing they are actually waiting for. Whatever
   waits must be set up so that the event cannot be missed if it happens
   immediately - on CI it frequently happens before the previous line has
   finished.
2. The consent window must be asserted through its own handle: assert the
   consent heading is showing there, approve it there, then assert the original
   page ends up showing the connected state. The documentation tab must be
   obtained the same way rather than by indexing into a list.
3. The exported file must be reached through whatever the run hands you when the
   download happens, not through a path assumed to exist on the machine. Assert
   the filename the server suggested, and assert the header row and the row
   count of the contents as the test does today.
4. No fixed sleeps anywhere in either file, and no hard-coded user directories.
5. If anything in `playwright.config.ts` has to change for the download to be
   available to the test, change it. If nothing does, say so and leave it.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/integrations.spec.ts ===============
import { test, expect } from '@playwright/test';

test('connects the calendar provider', async ({ page, context }) => {
  await page.goto('/settings/integrations');
  await page.getByRole('button', { name: 'Connect calendar' }).click();
  await page.waitForTimeout(2000);

  const consent = context.pages()[1];
  await consent.getByRole('button', { name: 'Allow' }).click();
  await page.waitForTimeout(1000);

  await expect(page.getByText('Calendar connected')).toBeVisible();
});

test('opens the provider documentation in a new tab', async ({ page, context }) => {
  await page.goto('/settings/integrations');
  await page.getByRole('link', { name: 'Provider documentation' }).click();
  await page.waitForTimeout(2000);

  const opened = context.pages();
  await expect(opened[opened.length - 1]).toHaveURL(/docs\.provider\.example/);
});

=============== FILE: tests/reports-export.spec.ts ===============
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('exports the quarterly report as CSV', async ({ page }) => {
  await page.goto('/reports/quarterly');
  await page.getByRole('button', { name: 'Download CSV' }).click();
  await page.waitForTimeout(3000);

  const file = path.join(os.homedir(), 'Downloads', 'quarterly.csv');
  const contents = fs.readFileSync(file, 'utf8');
  const rows = contents.trim().split('\n');

  expect(rows[0]).toBe('month,revenue,orders');
  expect(rows).toHaveLength(5);
});

=============== FILE: playwright.config.ts ===============
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
