import { test, expect } from '@playwright/test';

test('adding an item updates the cart badge', async ({ page }) => {
  await page.goto('/catalogue');
  await page.getByRole('button', { name: 'Add to cart' }).first().click();
  await expect(page.getByTestId('cart-badge')).toHaveText('1');
});
