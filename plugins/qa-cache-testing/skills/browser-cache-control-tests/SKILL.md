---
name: browser-cache-control-tests
description: "Wraps browser-side Cache-Control testing with Playwright (Cypress for legacy stacks): asserting response Cache-Control headers from Network events, ETag round-trips (If-None-Match → 304), service-worker strategies (Workbox cacheFirst / networkFirst / staleWhileRevalidate), and reload semantics (normal vs hard). Covers MDN Cache-Control + RFC 9111. Use when auditing browser-tier caching in E2E tests - the scope is behaviour a browser decides (served-from-cache, revalidation, SW strategy, reload semantics). Asserting only which Cache-Control value a server emits needs no browser: that belongs in the project's existing HTTP-level runner. For CDN-edge purge use cdn-cache-purge-tests; for the reverse-proxy tier use varnish-test-vtc-syntax; for an app-tier store use redis-cache-tests; SWR directive semantics live in stale-while-revalidate-reference."
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

- Verifying the browser acts on a Cache-Control value as
  intended - reuses from cache, revalidates, or refetches.
- Service-worker test patterns (Workbox).
- Tests for revalidation behaviour (ETag round-trip).
- Investigating "this page caches forever" or "cache never
  hits" complaints.

## When not to use

If the assertion is only *which* header the server sends, no
browser is involved and none is needed - assert it with the
project's existing HTTP client (supertest, requests, RestAssured,
`curl -I`) in the runner already configured there. Reach for this
skill when the browser's own decision is the thing under test.

## How to use

1. Pick the caching behaviour to assert: response `Cache-Control`
   header, ETag `304` round-trip, service-worker strategy, or
   reload semantics.
2. Scaffold a Playwright spec and attach a `page.on('response')`
   (or `page.on('request')`) listener before `page.goto`.
3. Read the header via `resp.headers()['cache-control']` and
   assert with a regex `toMatch`, never an exact string.
4. For served-from-cache proof, open a CDP session and read
   `Network.responseReceived.response.fromDiskCache` /
   `fromMemoryCache`.
5. For revalidation, reload after the TTL and assert the second
   response is `304` with a matching `If-None-Match`.
6. For service-worker strategies, populate the cache online, then
   `context.setOffline(true)` and reload.
7. Run `npx playwright test` across the Chromium / Firefox /
   WebKit matrix in CI.

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

The deeper recipes - served-from-cache detection via CDP, ETag
revalidation round-trips, hard-reload semantics, and
service-worker (Workbox) strategies - live in
[references/playwright-cache-recipes.md](references/playwright-cache-recipes.md).

## Worked example

A release ships hashed bundles (`app.4f2a.js`) that should cache
for a year, plus a `/api/me` endpoint that must never be cached.
One spec audits both:

```typescript
test('bundle immutable, /api/me uncached', async ({ page }) => {
  const seen: Record<string, string> = {};
  page.on('response', (resp) => {
    const cc = resp.headers()['cache-control'] ?? '';
    if (resp.url().match(/\.\w+\.js$/)) seen.bundle = cc;
    if (resp.url().endsWith('/api/me')) seen.api = cc;
  });
  await page.goto('https://example.com/dashboard');

  expect(seen.bundle).toMatch(/max-age=\d{6,}/);   // ~10+ days
  expect(seen.bundle).toContain('immutable');
  expect(seen.api).toMatch(/(no-store|private)/);
});
```

The bundle assertion fails if the build drops `immutable` (a
silent perf regression); the `/api/me` assertion fails if a proxy
adds a public `max-age`, catching an accidental leak of per-user
data into shared caches.

## Running

```bash
npx playwright test cache-tests.spec.ts
```

For service-worker tests, increase the test timeout - SW
registration is async.

Playwright installs alongside whatever the project already runs;
leave the existing `test` script pointed at that runner rather
than repointing it here.

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
  `cdn-cache-purge-tests`.

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
- Deeper authoring recipes:
  [references/playwright-cache-recipes.md](references/playwright-cache-recipes.md).
- Companion catalogs:
  `cache-coherence-patterns-reference`,
  `stale-while-revalidate-reference`.
- Sibling tools:
  `redis-cache-tests`,
  `cdn-cache-purge-tests`,
  `varnish-test-vtc-syntax`.
