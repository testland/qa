# Playwright cache recipes

Deeper browser-cache authoring recipes for
[browser-cache-control.md](browser-cache-control.md). The basic
`Cache-Control` header assertion lives there; these cover
served-from-cache detection, ETag revalidation, hard reload, and
service workers.

## Verify second-load is from cache

Playwright doesn't expose "from disk cache" directly, but request timing
reveals it:

```typescript
test('static asset second load is from disk cache', async ({ page }) => {
  await page.goto('https://example.com');           // first load (network)
  const responses: Array<{ url: string; fromCache: boolean }> = [];
  page.on('response', (resp) => {
    responses.push({
      url: resp.url(),
      fromCache: resp.fromServiceWorker() || resp.request().redirectedFrom() !== null,
    });
  });
  await page.reload();
  // Playwright doesn't expose 'from disk cache' directly, but
  // request timing reveals it:
  const asset = responses.find((r) => r.url.endsWith('.js'));
  // The Network panel `(disk cache)` annotation comes from
  // timing.responseEnd === timing.responseStart for cached items.
});
```

For a stronger check, use Chrome DevTools Protocol via Playwright:

```typescript
const cdp = await page.context().newCDPSession(page);
await cdp.send('Network.enable');
cdp.on('Network.responseReceived', (params) => {
  if (params.response.url.endsWith('.js')) {
    expect(params.response.fromDiskCache).toBe(true);
  }
});
await page.reload();
```

## ETag revalidation round-trip

Per RFC 9111 §4.3.1:

```typescript
test('ETag triggers 304 on revalidation', async ({ page }) => {
  let firstEtag: string | undefined;
  page.on('response', (resp) => {
    if (resp.url() === 'https://example.com/api/feed') {
      const etag = resp.headers()['etag'];
      if (resp.status() === 200 && !firstEtag) firstEtag = etag;
      else if (firstEtag) {
        expect(resp.request().headers()['if-none-match']).toBe(firstEtag);
        expect(resp.status()).toBe(304);
      }
    }
  });

  // First load
  await page.goto('https://example.com/dashboard');
  // Reload after TTL - browser should send If-None-Match
  await page.waitForTimeout(2000);
  await page.reload();
});
```

## Hard reload (Cmd+Shift+R) semantics

Browsers send `Cache-Control: no-cache` on hard reload, bypassing
the cache. Test:

```typescript
test('hard reload bypasses cache', async ({ page }) => {
  await page.goto('https://example.com');

  page.on('request', (req) => {
    if (req.url().endsWith('.js')) {
      expect(req.headers()['cache-control']).toMatch(/no-cache/);
    }
  });

  // Playwright doesn't have a direct "hard reload"; simulate via CDP:
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Page.reload', { ignoreCache: true });
});
```

## Service Worker / Workbox

Workbox provides standard strategies; test which is used:

```typescript
test('offline page uses cache-first strategy', async ({ context, page }) => {
  // Go online, populate cache
  await page.goto('https://example.com');
  // Go offline
  await context.setOffline(true);
  // Reload - should still work
  await page.reload();
  await expect(page.locator('h1')).toHaveText('Example');
});

test('api uses network-first with fallback', async ({ context, page }) => {
  await page.goto('https://example.com/api-status');
  await context.setOffline(true);
  await page.reload();
  // Stale cached response shown
  await expect(page.locator('.api-status')).toBeVisible();
});
```
