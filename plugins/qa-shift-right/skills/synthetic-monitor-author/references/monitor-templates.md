# Full monitor templates

The complete browser-check and API-check scripts the skill's Step 3
and Step 4 sketches are drawn from. Both are Checkly-style; adapt the
syntax per platform.

## Browser check (Playwright-style)

```typescript
// monitors/checkout-journey.spec.ts (Checkly-style)
import { test, expect } from '@playwright/test';

test('checkout journey - happy path', async ({ page }) => {
  // 1. Land on home page
  await page.goto('https://example.com/');
  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();

  // 2. Search and add to cart
  await page.getByRole('textbox', { name: 'Search' }).fill('BOOK-001');
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('link', { name: 'BOOK-001' }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();

  // 3. Complete checkout (with synthetic test account)
  await page.getByRole('link', { name: 'Cart' }).click();
  await page.getByRole('button', { name: 'Checkout' }).click();

  // (Use a dedicated synthetic-test account; never user real customer data)
  await page.getByLabel('Email').fill(process.env.SYNTHETIC_USER_EMAIL!);
  await page.getByLabel('Password').fill(process.env.SYNTHETIC_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();

  // 4. Place order with Stripe test card (in test mode in production!)
  await page.getByLabel('Card number').fill('4242 4242 4242 4242');
  await page.getByRole('button', { name: 'Place order' }).click();

  // 5. Assert confirmation
  await expect(page.getByRole('heading', { name: /Order confirmed/i })).toBeVisible();
});
```

Use accessibility-first locators (not CSS classes); synthetic
monitors that depend on CSS classes break on every UI refactor. Use
dedicated synthetic test accounts and test-mode payment processors so
the script doesn't trigger real charges or orders.

## API check (HTTP-step)

```yaml
# monitors/api-orders-flow.yml (Checkly-style; adapt per platform)
name: orders API journey
runtimeId: 2024.02
type: API
request:
  - name: 1. Get auth token
    method: POST
    url: https://api.example.com/auth/token
    headers:
      Content-Type: application/json
    body: |
      {"email": "{{SYNTHETIC_USER_EMAIL}}", "password": "{{SYNTHETIC_USER_PASSWORD}}"}
    assertions:
      - source: STATUS_CODE
        comparison: EQUALS
        target: 200
      - source: JSON_BODY
        property: $.access_token
        comparison: NOT_EMPTY
    setup: |
      // Save token for next request
      vars.set('TOKEN', response.body.access_token);

  - name: 2. List orders
    method: GET
    url: https://api.example.com/orders
    headers:
      Authorization: Bearer {{TOKEN}}
    assertions:
      - source: STATUS_CODE
        comparison: EQUALS
        target: 200
      - source: RESPONSE_TIME
        comparison: LESS_THAN
        target: 500   # ms
      - source: JSON_BODY
        property: $.orders
        comparison: IS_ARRAY

  - name: 3. Get specific order
    method: GET
    url: https://api.example.com/orders/{{TEST_ORDER_ID}}
    headers:
      Authorization: Bearer {{TOKEN}}
    assertions:
      - source: STATUS_CODE
        comparison: EQUALS
        target: 200
      - source: JSON_SCHEMA
        target: schemas/order.json
```

Per-step assertions distinguish "the API returned" from "the API
returned the right thing" - assert status code, response shape, and
response time.
