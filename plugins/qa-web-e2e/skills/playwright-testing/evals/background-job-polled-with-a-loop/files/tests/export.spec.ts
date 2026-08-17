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
