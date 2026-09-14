import { test, expect } from '../fixtures';

test('the dashboard shows the account credit', async ({ page, account }) => {
  await page.goto(`/a/${account.id}`);
  await expect(page.getByTestId('credit-remaining')).toHaveText('5,000.00');
});

test('the plan badge reads the current plan', async ({ page, account }) => {
  await page.goto(`/a/${account.id}`);
  await expect(page.getByTestId('plan-name')).toHaveText('Starter');
});

test('the dispatch board opens on today', async ({ page, account }) => {
  await page.goto(`/a/${account.id}/board`);
  await expect(page.getByTestId('board-date')).toHaveText('Today');
});
