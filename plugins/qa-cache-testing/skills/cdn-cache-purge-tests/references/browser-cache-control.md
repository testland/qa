# Client-tier (browser) Cache-Control tests

Browser cache tests verify the **request side** of caching: does the
browser actually respect the `Cache-Control` headers the server sends?
Per [MDN Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)
the directive set is identical to
[RFC 9111](https://www.rfc-editor.org/rfc/rfc9111.html), but runtime
behaviour differs subtly between Chromium, Firefox, and Safari. Scope:
behaviour a browser decides (served-from-cache, revalidation, SW strategy,
reload semantics). Asserting only *which* header the server emits needs no
browser - do that in the project's existing HTTP-level runner (supertest,
requests, RestAssured, `curl -I`).

## Workflow

1. Pick the behaviour to assert: response `Cache-Control` header, ETag
   `304` round-trip, service-worker strategy, or reload semantics.
2. Scaffold a Playwright spec; attach `page.on('response')` before
   `page.goto`.
3. Read `resp.headers()['cache-control']` and assert with a regex
   `toMatch`, never an exact string (vendors append directives).
4. For served-from-cache proof, use CDP
   `Network.responseReceived.response.fromDiskCache` / `fromMemoryCache`.
5. For revalidation, reload after the TTL and assert the second response
   is `304` with a matching `If-None-Match`.
6. For service-worker strategies, populate the cache online, then
   `context.setOffline(true)` and reload.
7. Run `npx playwright test` across the Chromium / Firefox / WebKit matrix.

## Worked example - hashed bundle + uncached API in one spec

```typescript
import { test, expect } from '@playwright/test';

test('bundle immutable, /api/me uncached', async ({ page }) => {
  const seen: Record<string, string> = {};
  page.on('response', (resp) => {
    const cc = resp.headers()['cache-control'] ?? '';
    if (resp.url().match(/\.\w+\.js$/)) seen.bundle = cc;
    if (resp.url().endsWith('/api/me')) seen.api = cc;
  });
  await page.goto('https://example.com/dashboard');

  expect(seen.bundle).toMatch(/max-age=\d{6,}/);   // ~10+ days
  expect(seen.bundle).toContain('immutable');      // per RFC 8246
  expect(seen.api).toMatch(/(no-store|private)/);
});
```

The bundle assertion fails if the build drops `immutable` (silent perf
regression); the `/api/me` assertion catches a proxy adding a public
`max-age` - a leak of per-user data into shared caches.

The deeper recipes - served-from-cache detection via CDP, ETag
revalidation round-trips, hard-reload semantics, and service-worker
(Workbox) strategies - are in
[playwright-cache-recipes.md](playwright-cache-recipes.md).

## Useful response-event surface

| Method | Returns |
|---|---|
| `resp.status()` | HTTP status |
| `resp.headers()` | All response headers |
| `resp.fromServiceWorker()` | Whether a SW intercepted |
| `resp.request().headers()` | Request headers (`If-None-Match`) |
| `resp.timing()` | Cached fetches have minimal `responseEnd - responseStart` |

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| `status() == 200` to "prove" a cache miss | 304 is also cache-related | Inspect headers / `fromDiskCache` |
| Fresh browser context per test | Cache starts empty; no "second load" | Reuse the context within a test |
| Exact-string `cache-control` assertions | Vendor directives break it | Regex `toMatch` |
| Chromium-only runs | Safari + Firefox differ (SW, ITP) | Run the matrix in CI |
| No 304 test | ETag round-trip drift unnoticed | Test the second-load 304 path |
| Mocking `caches.match()` | Bypasses the real storage layer | Real `Cache` API + Playwright |

## Limitations

- Playwright network events don't always expose `fromDiskCache`; some
  assertions need raw CDP.
- Tests run with fresh profiles - long-term eviction behaviour under
  storage pressure isn't exercisable.
- Service-worker registration is async; wait for
  `navigator.serviceWorker.ready` before asserting.

## References

- MDN Cache-Control:
  [developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)
- RFC 9111: [www.rfc-editor.org/rfc/rfc9111.html](https://www.rfc-editor.org/rfc/rfc9111.html)
- RFC 8246 immutable: [www.rfc-editor.org/rfc/rfc8246.html](https://www.rfc-editor.org/rfc/rfc8246.html)
- Workbox: [developer.chrome.com/docs/workbox](https://developer.chrome.com/docs/workbox)
- Playwright Network API: [playwright.dev/docs/network](https://playwright.dev/docs/network)
