# Checkout spec is flaky on CI

## Problem Description

`tests/checkout.spec.ts` passes locally and fails perhaps one run in four on
our CI runners, which are slower than a developer laptop. When it fails the
report just says the element was not found, and re-running usually goes green.

The spec also breaks whenever the frontend team touches styling, because a
couple of the lookups are pinned to class names that change with the design
system.

It is currently one long test covering sign-in, browsing, adding to the cart
and checking out. When it fails partway we cannot tell which part broke without
reading the whole trace.

## Output Specification

Rework `tests/checkout.spec.ts` so it is reliable on a slow runner and no longer
tied to styling:

1. Remove the fixed sleeps. Waiting must be driven by the condition being
   waited for, not by a duration someone guessed.
2. Replace the styling-coupled lookups with ones that survive a CSS refactor.
3. Split the single test into one test per flow, so a failure names the flow
   that broke. Shared navigation may live in a helper.

Do not change `tests/login.spec.ts`; it is stable and outside this work.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/checkout.spec.ts ===============
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

=============== FILE: tests/login.spec.ts ===============
import { test, expect } from '@playwright/test';

test('rejects a bad password', async ({ page }) => {
  await page.goto('/signin');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('wrong');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('alert')).toHaveText(/incorrect password/i);
});

=============== FILE: playwright.config.ts ===============
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
