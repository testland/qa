# Network and locator-drift flake fixes

Deep reference for `flake-pattern-reference` SKILL.md. The Pattern 5
(network / external service) and Pattern 6 (locator drift) code fixes,
split out of the main guide so the four core-pattern fixes stay in front.

## Pattern 5 fix: network / external service

**Root cause:** the test reaches a real network endpoint that is slow,
rate-limited, or unavailable in CI.

### Playwright: intercept with page.route()

`page.route(urlPattern, handler)` intercepts every request matching the
pattern and stalls it until you call `fulfill`, `continue`, or `abort`
([pw-network][pw-net]):

```typescript
await page.route('**/api/users', route =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ id: 1, name: 'Alice' }]),
  })
);

await page.goto('/users');
await expect(page.getByRole('listitem')).toHaveCount(1);
```

Use `browserContext.route()` instead of `page.route()` when the request
originates from a popup or a new page ([pw-api][pw-api]).

Block non-essential traffic (images, analytics) to speed up tests:

```typescript
await page.route('**/*.{png,jpg,jpeg,gif,webp}', route => route.abort());
```

### MSW (unit / integration tests)

Mock Service Worker intercepts fetch and XHR at the Node.js level for
unit and integration tests ([msw-start][msw]):

```typescript
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  http.get('https://api.example.com/user', () =>
    HttpResponse.json({ id: 'abc-123', name: 'Alice' })
  )
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());   // clean per-test overrides
afterAll(() => server.close());
```

### Smoke / contract tests that need a real endpoint

Isolate them in a separate Playwright project or Jest project with a
`--testPathPattern` that CI runs outside the main gate. The main merge
gate only runs mocked suites.

## Pattern 6 fix: locator drift

**Root cause:** selectors matched by CSS class, position, or text that
shifts with unrelated UI changes.

### Prefer role-based locators

Playwright recommends `getByRole()` as the primary locator strategy
because it reflects how users and assistive technology perceive the
page ([pw-best-practices][pw-bp]):

```typescript
// Before - CSS class breaks on a design-system update
await page.locator('button.btn-primary.checkout-btn').click();

// After - survives CSS changes; tied to accessible role + name
await page.getByRole('button', { name: 'Checkout' }).click();
```

Fallback order: `getByRole` > `getByTestId` > `getByLabel` / `getByText`
> CSS/XPath (last resort).

### Add data-testid for elements with no stable role

```html
<div class="card" data-testid="product-card-42">...</div>
```

```typescript
await page.getByTestId('product-card-42').click();
```

### Strictness prevents silent multi-match

Playwright locators are strict by default: if a locator matches more
than one element, the action throws rather than silently acting on the
first match ([pw-locators][pw-loc]):

```typescript
// Throws immediately if two buttons match - forces you to be more specific
await page.getByRole('button', { name: 'Delete' }).click();
```

Narrow an ambiguous locator with `.filter()`:

```typescript
await page
  .getByRole('listitem')
  .filter({ hasText: 'Product 42' })
  .getByRole('button', { name: 'Delete' })
  .click();
```

[pw-net]: https://playwright.dev/docs/network
[pw-api]: https://playwright.dev/docs/api/class-page
[msw]: https://mswjs.io/docs/getting-started
[pw-bp]: https://playwright.dev/docs/best-practices
[pw-loc]: https://playwright.dev/docs/locators
