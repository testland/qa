---
name: browser-cache-control-tests
description: "Wraps browser-side Cache-Control testing patterns using Playwright (and Cypress for legacy stacks): verifying response Cache-Control headers from Network events, asserting ETag round-trips (request includes If-None-Match → server returns 304), testing service-worker cache strategies (Workbox cacheFirst / networkFirst / staleWhileRevalidate), and verifying browser cache behavior under reload (normal reload vs hard reload semantics). Covers MDN's Cache-Control semantics + RFC 9111. Use when designing browser-cache-respecting endpoints or auditing caching behaviour in E2E tests."
rating: 22
d6: 4
---

# browser-cache-control-tests

## Overview

Browser cache tests verify the **request-side** of caching:
does the browser actually respect the `Cache-Control` headers
the server sends? Per [MDN Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control),
the directive set is identical to RFC 9111
([www.rfc-editor.org/rfc/rfc9111.html](https://www.rfc-editor.org/rfc/rfc9111.html)),
but the runtime behaviour differs subtly between Chromium,
Firefox, and Safari.

## When to use

- Verifying a new endpoint's Cache-Control is interpreted as
  intended.
- Service-worker test patterns (Workbox).
- Tests for revalidation behaviour (ETag round-trip).
- Investigating "this page caches forever" or "cache never
  hits" complaints.

## Authoring

### Playwright network interception

Playwright can inspect every request + response, including
served-from-cache state.

```typescript
import { test, expect } from '@playwright/test';

test('static assets have long Cache-Control', async ({ page }) => {
  page.on('response', (resp) => {
    if (resp.url().endsWith('.js')) {
      const cc = resp.headers()['cache-control'];
      expect(cc).toMatch(/max-age=\d{6,}/);  // ≥ ~10 days
      expect(cc).toContain('immutable');     // per RFC 8246
    }
  });
  await page.goto('https://example.com');
});

test('API responses are not cached by default', async ({ page }) => {
  page.on('response', (resp) => {
    if (resp.url().includes('/api/')) {
      const cc = resp.headers()['cache-control'];
      expect(cc).toMatch(/(no-store|max-age=0|private)/);
    }
  });
  await page.goto('https://example.com/dashboard');
});
```

### Verify second-load is from cache

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

### ETag revalidation round-trip

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
  // Reload after TTL — browser should send If-None-Match
  await page.waitForTimeout(2000);
  await page.reload();
});
```

### Hard reload (Cmd+Shift+R) semantics

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

### Service Worker / Workbox

Workbox provides standard strategies; test which is used:

```typescript
test('offline page uses cache-first strategy', async ({ context, page }) => {
  // Go online, populate cache
  await page.goto('https://example.com');
  // Go offline
  await context.setOffline(true);
  // Reload — should still work
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

## Running

```bash
npx playwright test cache-tests.spec.ts
```

For service-worker tests, increase the test timeout - SW
registration is async.

## Parsing results

Playwright's `response` event gives access to:

| Method | Returns |
|---|---|
| `resp.status()` | HTTP status code |
| `resp.headers()` | All response headers |
| `resp.fromServiceWorker()` | Whether SW intercepted |
| `resp.request().headers()` | Request headers (for `If-None-Match`) |
| `resp.timing()` | Request timing (cached fetches have minimal `responseEnd - responseStart`) |

For the canonical "served from cache" assertion, fall back to
CDP `Network.responseReceived.response.fromDiskCache` or
`fromMemoryCache`.

## CI integration

```yaml
jobs:
  browser-cache-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci && npx playwright install --with-deps chromium
      - run: npx playwright test tests/cache/
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Asserting on response.status() == 200 to "prove" cache miss | 304 is also cache-related; misses revalidation cases | Inspect headers / fromDiskCache |
| Per-test fresh browser context | Cache starts empty; can't test "second load" pattern | Reuse context within a test |
| Asserting on `cache-control` matches exact string | Server adds vendor-specific directives; brittle | Use regex `toMatch` |
| Testing only Chromium | Safari + Firefox have differences (Service Worker, ITP) | Run matrix in CI |
| Skipping `immutable` test for hashed assets | Browsers re-validate; perf regression silent | Per RFC 8246, hashed asset URLs should be `immutable` |
| No 304 test | ETag round-trip drift unnoticed | Test the second-load 304 path |
| Mocking `caches.match()` | Bypasses the actual storage layer | Use real `Cache` API + Playwright |
| Hard reload behaviour assumed cross-browser | Safari hard-reload differs from Chrome | Test the actual target browsers |

## Limitations

- **Playwright's network events don't always include
  `fromDiskCache`.** Some assertions need raw CDP.
- **Browser cache implementation varies.** Edge cases (e.g.,
  HTTPS+private mode, ITP) may differ from documented behaviour.
- **Tests run with fresh profiles.** Long-term browser-cache
  behaviour (eviction under storage pressure) isn't exercisable.
- **Service Worker registration is async.** Tests must wait for
  `navigator.serviceWorker.ready` before assertions.
- **Doesn't test the CDN tier.** Pair with
  [`cdn-cache-purge-tests`](../cdn-cache-purge-tests/SKILL.md).

## References

- MDN Cache-Control:
  [developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control).
- RFC 9111 (canonical):
  [www.rfc-editor.org/rfc/rfc9111.html](https://www.rfc-editor.org/rfc/rfc9111.html).
- RFC 8246 immutable:
  [www.rfc-editor.org/rfc/rfc8246.html](https://www.rfc-editor.org/rfc/rfc8246.html).
- Workbox testing:
  [developer.chrome.com/docs/workbox](https://developer.chrome.com/docs/workbox).
- Playwright Network API:
  [playwright.dev/docs/network](https://playwright.dev/docs/network).
- Companion catalogs:
  [`cache-coherence-patterns-reference`](../cache-coherence-patterns-reference/SKILL.md),
  [`stale-while-revalidate-reference`](../stale-while-revalidate-reference/SKILL.md).
- Sibling tools:
  [`redis-cache-tests`](../redis-cache-tests/SKILL.md),
  [`cdn-cache-purge-tests`](../cdn-cache-purge-tests/SKILL.md),
  [`varnish-test-vtc-syntax`](../varnish-test-vtc-syntax/SKILL.md).
