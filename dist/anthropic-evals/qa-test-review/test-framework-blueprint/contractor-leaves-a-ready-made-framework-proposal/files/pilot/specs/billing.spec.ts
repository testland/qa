import { test, expect } from '../fixtures';

test('upgrading moves the account onto the scale plan', async ({ page, account }) => {
  await page.goto(`/a/${account.id}/settings/billing`);
  await page.getByRole('button', { name: 'Upgrade to Scale' }).click();
  await expect(page.getByTestId('plan-name')).toHaveText('Scale');
});

test('an upgrade is listed on the billing history', async ({ page, account }) => {
  await page.goto(`/a/${account.id}/settings/billing`);
  await expect(page.getByTestId('billing-history').getByRole('row')).toHaveCount(2);
});
