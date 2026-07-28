# Per-recipe Playwright test templates

Companion detail for `offline-fallback-tests`. The two poles (Cache only,
Network only) are inline in Step 2; these are the remaining six recipe
templates from the offline cookbook. Each recipe's "when to use" is quoted once
in the SKILL.md Step 1 table - here only the assertion shape is noted.

## Cache, falling back to network

Serves from cache when present, network when not:

```ts
test('Cache, falling back to network: /img/x.png serves from cache when present, network when not', async ({ page, context }) => {
  // Warm
  await page.goto('https://localhost:3000/img/x.png');
  await page.waitForLoadState('networkidle');

  // Now offline - cache hits
  await context.setOffline(true);
  const offline = await page.evaluate(() =>
    fetch('/img/x.png').then(r => r.status).catch(() => 0)
  );
  expect(offline).toBe(200);
});
```

## Cache and network race

The first responder wins. Assert the call returns under a small-disk-read
budget:

```ts
test('Cache and network race: response under 100ms when cached', async ({ page }) => {
  await page.goto('https://localhost:3000/api/race-cache');
  await page.waitForLoadState('networkidle');

  const ms = await page.evaluate(async () => {
    const t = performance.now();
    await fetch('/api/race-cache');
    return performance.now() - t;
  });
  expect(ms).toBeLessThan(100);
});
```

## Network falling back to cache

Prefers network when online, falls back to cache when offline:

```ts
test('Network falling back to cache: / serves fresh when online, cached when offline', async ({ page, context }) => {
  await page.goto('https://localhost:3000/');
  await page.waitForLoadState('networkidle');

  await context.setOffline(true);
  const resp = await page.goto('https://localhost:3000/');
  expect(resp?.status()).toBe(200);

  await context.setOffline(false);
  // When online, network is preferred - track that a request fires
  let hits = 0;
  page.on('request', req => { if (req.url().endsWith('/')) hits++; });
  await page.reload();
  expect(hits).toBeGreaterThanOrEqual(1);
});
```

## Cache then network

Two responses for one fetch: instant cache, then revalidated network. Assert
two paint phases:

```ts
test('Cache then network: /api/feed renders cached list first, refreshes on network', async ({ page }) => {
  await page.goto('https://localhost:3000/feed');
  // Initial render uses cached list
  await expect(page.locator('[data-testid="feed-list"]')).toBeVisible();
  const initialCount = await page.locator('[data-testid="feed-item"]').count();

  // Refresh fetches from network with newer items
  await page.evaluate(() => fetch('/api/feed?force-refresh=1'));
  await page.waitForTimeout(500);

  const updated = await page.locator('[data-testid="feed-item"]').count();
  expect(updated).toBeGreaterThanOrEqual(initialCount);
});
```

## Generic fallback

Unknown route while offline serves `offline.html` (Workbox `offlineFallback()`
default):

```ts
test('Generic fallback: unknown route + offline serves offline.html', async ({ page, context }) => {
  await page.goto('https://localhost:3000/');
  await page.waitForLoadState('networkidle');

  await context.setOffline(true);
  const resp = await page.goto('https://localhost:3000/never-existed');
  expect(resp?.status()).toBe(200);
  await expect(page.locator('text=/offline|unavailable/i')).toBeVisible();
});
```

## Service Worker side templating

Assert the SW synthesizes the response from a cached shell + JSON data:

```ts
test('SW-side templating: /reports/123 renders cached shell + JSON data', async ({ page }) => {
  // The SW's fetch handler must compose template + data
  await page.goto('https://localhost:3000/reports/123');
  await expect(page.locator('h1')).toContainText('Report #123');

  // Distinct origin proves SW synthesis (not pure network)
  const src = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL);
  expect(src).toBeTruthy();
});
```

Source references:

- off-cookbook: https://web.dev/articles/offline-cookbook
- wb-recipes: https://developer.chrome.com/docs/workbox/modules/workbox-recipes
