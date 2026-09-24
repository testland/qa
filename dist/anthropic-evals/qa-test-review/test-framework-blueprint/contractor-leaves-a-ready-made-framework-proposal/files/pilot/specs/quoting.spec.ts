import { test, expect } from '../fixtures';

test('the starter tier price applies to a mid-band parcel', async ({ page, account }) => {
  await page.goto(`/a/${account.id}/quotes/new`);
  await page.getByLabel('Weight (kg)').fill('4');
  await page.getByLabel('Zone').selectOption('B');
  await expect(page.getByTestId('quote-total')).toHaveText('18.50');
});

test('booking a shipment draws the quote off the account credit', async ({ page, account }) => {
  await page.goto(`/a/${account.id}/quotes/new`);
  await page.getByLabel('Weight (kg)').fill('4');
  await page.getByLabel('Zone').selectOption('B');
  await page.getByRole('button', { name: 'Book shipment' }).click();
  await expect(page.getByTestId('credit-remaining')).toHaveText('4,981.50');
});
