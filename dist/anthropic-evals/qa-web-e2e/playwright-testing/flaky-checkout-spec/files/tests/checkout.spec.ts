import { test, expect } from '@playwright/test';

test('checkout end to end', async ({ page }) => {
  await page.goto('/');

  await page.click('.header__signin-link');
  await page.waitForTimeout(1000);

  await page.fill('#email', 'user@example.com');
  await page.fill('#password', 'test-password');
  await page.click('.btn.btn--primary');
  await page.waitForTimeout(2000);

  expect(await page.isVisible('.welcome-banner')).toBe(true);

  await page.click('.nav-links > li:nth-child(2) > a');
  await page.waitForTimeout(1500);

  await page.click('.product-card:nth-child(1) .product-card__title');
  await page.click('.add-to-cart');
  await page.waitForTimeout(1000);

  expect(await page.textContent('.cart-count')).toBe('1');

  await page.click('.cart-icon');
  await page.click('.checkout-button');
  await page.waitForTimeout(3000);

  await page.fill('#card-number', '4242424242424242');
  await page.fill('#card-expiry', '12/30');
  await page.click('.pay-now');
  await page.waitForTimeout(3000);

  expect(await page.isVisible('.order-confirmed')).toBe(true);
});
