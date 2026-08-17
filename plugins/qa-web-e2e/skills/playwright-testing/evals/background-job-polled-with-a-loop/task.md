# Export test hand-rolls its own waiting loop

## Problem Description

Exporting a report queues a background job. Nothing changes on the page while it
runs, so `tests/export.spec.ts` polls a status endpoint itself: a `for` loop
with a one-second sleep, thirty iterations, break on `done`.

Two things are wrong with it. The cap is arbitrary - a job that takes 35 seconds
on a loaded CI box makes the loop fall out still running, and the failure we get
is a bare "expected done, received running" that tells us nothing about how long
we waited or what the endpoint was actually returning. And when we bumped the
iteration count to make it pass, everything else in the run got slower for no
reason, because the loop always sleeps a full second even when the job finished
in fifty milliseconds.

There is a second, quieter version of the same bug further down. The exporter
writes a summary into browser storage a beat after the job completes, and the
test reads that value once, immediately, so it fails roughly one run in six with
`Cannot read properties of null`.

The row count at the end has the same shape: it reads the number of rows once
and compares it, which fails whenever the table has not finished re-rendering.

The element checks in this suite are fine - it is the checks on values that are
not page elements that keep biting us.

## Output Specification

1. Both the job status and the stored summary must be waited for by something
   that re-reads the value and retries until it satisfies the check, instead of
   a loop we wrote. Neither value is an element on the page, so whatever handles
   waiting for elements does not apply.
2. A wait that runs out must report the last value it observed and carry a
   message naming what was being waited for, so the failure is readable without
   opening a trace.
3. Longer allowances belong on the individual wait that needs them. Do not raise
   the timeout for the whole suite to accommodate one slow job.
4. The row count check must also stop reading once.
5. Keep all three checks: the job reaching `done`, the stored summary reporting
   4200 rows, and more than three rows rendered. Do not change application code.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/export.spec.ts ===============
import { test, expect } from '@playwright/test';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test('exported report becomes available', async ({ page, request }) => {
  await page.goto('/reports');
  await page.getByRole('button', { name: 'Export' }).click();

  await expect(page.getByTestId('job-id')).toBeVisible();
  const jobId = await page.getByTestId('job-id').textContent();

  let status = 'queued';
  for (let attempt = 0; attempt < 30; attempt++) {
    const response = await request.get(`/api/jobs/${jobId}`);
    status = (await response.json()).status;
    if (status === 'done') break;
    await sleep(1000);
  }
  expect(status).toBe('done');

  const cached = await page.evaluate(() => window.localStorage.getItem('lastExport'));
  expect(JSON.parse(cached as string).rows).toBe(4200);

  await page.getByRole('button', { name: 'Refresh' }).click();
  expect(await page.getByRole('row').count()).toBeGreaterThan(3);
});

=============== FILE: tests/reports-page.spec.ts ===============
import { test, expect } from '@playwright/test';

test('reports page lists saved reports', async ({ page }) => {
  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Quarterly revenue' })).toBeVisible();
});

=============== FILE: playwright.config.ts ===============
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
