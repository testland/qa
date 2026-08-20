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
