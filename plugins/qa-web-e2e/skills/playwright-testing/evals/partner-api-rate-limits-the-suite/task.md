# Suite depends on a partner API that throttles us

## Problem Description

The checkout page fetches shipping rates from a partner service at
`https://rates.partner.example/v2/quote`. Our contract allows about forty calls
a minute; a full CI run makes roughly a hundred and twenty, so somewhere in the
middle of every run the partner starts returning 429 and the rest of the
shipping tests go red. Re-running moves the failures around but does not remove
them.

There is a second problem underneath that one. The checkout page has a fallback
banner reading "Shipping calculated at dispatch" that appears when the partner
is unavailable. We have never tested it, because we have no way to make the
partner fail on purpose. It broke in April and we found out from a customer.

Separately, `tests/checkout-rates.spec.ts` has a second test that checks the
cart total and currency. It clicks through six pages to get there, takes about
forty seconds, and all it is really asserting is the shape of our own
`GET /api/cart` response. It fails for reasons that have nothing to do with the
contract it is checking.

Everything needed is already installed. We are not adding packages for this, and
we are not touching application source.

## Output Specification

1. No request from this suite may reach `rates.partner.example`. The response
   the page receives from that host must be decided inside the test that needs
   it, with a payload the test states.
2. The existing rate test keeps asserting what the page renders - the standard
   option and its price - now driven by the payload the test supplies.
3. Add two cases for the fallback banner: one where the partner answers with a
   server error, and one where the request does not complete at all. They are
   different failure modes and must be produced differently, not the same one
   twice.
4. Move the cart total and currency check into a new `tests/cart-api.spec.ts`
   that asserts our own `/api/cart` response - status and body - directly,
   without opening a page or clicking anything. The remaining UI test should no
   longer need those six steps.
5. Do not add dependencies, do not start a mock server process, and do not
   modify application code.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/checkout-rates.spec.ts ===============
import { test, expect } from '@playwright/test';

test('shows shipping options from the partner', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByLabel('Postcode').fill('SW1A 1AA');
  await page.getByRole('button', { name: 'Get rates' }).click();

  await expect(page.getByRole('radio', { name: /standard/i })).toBeVisible();
  await expect(page.getByText('£3.99')).toBeVisible();
  await expect(page.getByRole('radio', { name: /express/i })).toBeVisible();
});

test('cart total and currency', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Shop' }).click();
  await page.getByRole('link', { name: 'BOOK-001' }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.getByRole('link', { name: 'Cart' }).click();

  await expect(page.getByTestId('cart-total')).toHaveText('£12.50');
  await expect(page.getByTestId('cart-currency')).toHaveText('GBP');
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

=============== FILE: package.json ===============
{
  "name": "storefront-e2e",
  "private": true,
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "typescript": "^5.6.3"
  }
}

=============== FILE: docs/partner-quote-response.json ===============
{
  "currency": "GBP",
  "options": [
    { "code": "STD", "label": "Standard", "price": "3.99", "eta_days": 4 },
    { "code": "EXP", "label": "Express", "price": "8.49", "eta_days": 1 }
  ]
}
