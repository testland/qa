# Per-recipe runtime test templates

Companion detail for `workbox-tests`. The `imageCache()` 60-entry-cap test is
the representative core inline in Step 4; these are the other five recipe
templates. Each retains the recipe's test-invariant default (timeout, entry
count, TTL) but drops the verbatim doc prose. Defaults are the Workbox v7.x
values per wb-recipes - re-pin at the recipe page on a major upgrade.

## pageCache()

Network-first for HTML navigations with a 3-second `networkTimeoutSeconds`
default - cache serves once network exceeds the timeout:

```ts
import { test, expect } from '@playwright/test';

test('pageCache() falls back to cache when network exceeds 3s', async ({ page, context }) => {
  await page.goto('https://localhost:3000/');
  await page.waitForLoadState('networkidle');

  // Slow the network past the 3s networkTimeoutSeconds default
  await context.route('**/*.html', async route => {
    await new Promise(r => setTimeout(r, 5_000));
    await route.continue();
  });

  await page.goto('https://localhost:3000/');
  // Cached shell should serve before the 5s slow network resolves
  await expect(page.locator('h1')).toBeVisible({ timeout: 4_500 });
});
```

## offlineFallback()

Serves the `offline.html` default on a navigation routing error while offline
(swap the target if the project overrides `pageFallback`):

```ts
test('offlineFallback() serves offline.html on navigation failure', async ({ page, context }) => {
  await page.goto('https://localhost:3000/');
  await page.waitForLoadState('networkidle');

  await context.setOffline(true);
  const resp = await page.goto('https://localhost:3000/never-cached');
  expect(resp?.status()).toBe(200);
  await expect(page.locator('text=/offline/i')).toBeVisible();
});
```

## googleFontsCache()

Stale-while-revalidate for stylesheets, cache-first for font files, with
defaults of 30 font files cached for one year:

```ts
test('googleFontsCache stylesheet uses stale-while-revalidate', async ({ page, context }) => {
  await page.goto('https://localhost:3000/');
  await page.waitForLoadState('networkidle');

  await context.setOffline(true);
  const status = await page.evaluate(() =>
    fetch('https://fonts.googleapis.com/css2?family=Inter').then(r => r.status).catch(() => 0)
  );
  // Stale cache must respond offline
  expect(status).toBe(200);
});
```

## staticResourceCache()

Stale-while-revalidate for CSS, JavaScript, and Web Worker requests:

```ts
test('staticResourceCache serves cached CSS offline', async ({ page, context }) => {
  await page.goto('https://localhost:3000/');
  await page.waitForLoadState('networkidle');
  await context.setOffline(true);

  const status = await page.evaluate(() =>
    fetch('/styles/app.css').then(r => r.status).catch(() => 0)
  );
  expect(status).toBe(200);
});
```

## warmStrategyCache()

Loads the declared URL list into the cache during the SW install phase - pin
which URLs are warmed:

```ts
test('warmStrategyCache() warms the declared URL list on install', async ({ context, page }) => {
  await page.goto('https://localhost:3000/');
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');

  // SW install phase warms a known URL - pin it
  const warmed = await sw.evaluate(async () => {
    const names = await caches.keys();
    for (const n of names) {
      const cache = await caches.open(n);
      const keys = await cache.keys();
      if (keys.some(k => k.url.endsWith('/critical-data.json'))) return true;
    }
    return false;
  });
  expect(warmed).toBe(true);
});
```

Source reference:

- wb-recipes: https://developer.chrome.com/docs/workbox/modules/workbox-recipes
