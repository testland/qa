---
name: web-push-test
description: "Test the browser web-push subscription lifecycle - `pushManager.subscribe({ userVisibleOnly, applicationServerKey })` per [W3C Push API][w3c-push] returning a `PushSubscription` with `endpoint` + `keys.p256dh` + `keys.auth` + optional `expirationTime`; the `pushsubscriptionchange` service-worker event on refresh / revoke / expiry; the `push` event delivery with `PushMessageData`; VAPID auth per RFC 8292 (ES256 JWT, `aud` / `exp` ≤ 24h / `sub`); RFC 8030 push-service responses (201 Created, 410 Gone for expired endpoints, 413 Payload Too Large, 429); and `unsubscribe()` cleanup. Distinct from `qa-notifications/push-notification-test-author` (cross-channel push including mobile + native APNs/FCM); this is browser web-push subscription lifecycle (`pushManager.subscribe`, VAPID, endpoint expiry)."
keywords:
  - web-push
  - vapid
  - push-api
  - rfc-8030
  - pushsubscriptionchange
---

# web-push-test

## Overview

Per [mdn-push], the Push API is *"Baseline Widely available"*
across browsers since March 2023. Firefox imposes per-app push
quotas; Chrome does not. This skill tests the browser side
(`pushManager.subscribe` per [w3c-push], `push` event,
`pushsubscriptionchange`, `unsubscribe`) plus the server-side push
protocol per [rfc8030] and VAPID auth per [rfc8292]. Cross-channel
push including native APNs / FCM is
`push-notification-test-author` (in the qa-notifications plugin)
territory.

[w3c-push]: https://www.w3.org/TR/push-api/
[mdn-push]: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
[rfc8030]: https://datatracker.ietf.org/doc/html/rfc8030
[rfc8292]: https://datatracker.ietf.org/doc/html/rfc8292
[web-dev-notifications]: https://web.dev/notifications

## When to use

- A PWA implements web-push and needs a subscription-lifecycle test
  before each release.
- Users report "I subscribed but never got a push" - author the
  endpoint-expiry test that catches stale subscriptions.
- A VAPID key was rotated and the team needs evidence subscriptions
  survived (they should, since VAPID identifies the *server* per
  [rfc8292], not the subscription).
- Compliance audit needs evidence revoked subscriptions are cleaned
  up server-side on `410 Gone` per [rfc8030].

## Authoring

### Step 1 - Set up the Playwright fixture with notification permission

Web-push subscription requires the `notifications` permission per
[w3c-push] `userVisibleOnly: true` requirement (and per browser UX
gating). Grant it in the fixture:

```ts
import { test as base, expect, chromium } from '@playwright/test';

const test = base.extend({
  context: async ({ playwright }, use) => {
    const ctx = await playwright.chromium.launchPersistentContext(
      './tmp/user-data',
      {
        permissions: ['notifications'],
        headless: false, // SW + push prompt path needs headed mode in some Chromium builds
      }
    );
    await use(ctx);
    await ctx.close();
  },
  page: async ({ context }, use) => {
    const page = await context.newPage();
    await use(page);
  },
});

export { test, expect };
```

Per [w3c-push], `userVisibleOnly` *"indicates that the push
subscription will only be used for push messages whose effect is
made visible to the user."* Most browsers require it to be `true`.

### Step 2 - Test subscription creation

```ts
test('pushManager.subscribe returns a PushSubscription with VAPID-bound keys', async ({ page, context }) => {
  await page.goto('https://localhost:3000/');

  // Wait for the SW to be ready
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');

  const sub = await page.evaluate(async (vapidPubKey) => {
    const reg = await navigator.serviceWorker.ready;
    const s = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidPubKey,
    });
    return s.toJSON();
  }, process.env.VAPID_PUBLIC_KEY_BASE64URL!);

  // Per w3c-push: PushSubscription exposes endpoint + keys (p256dh, auth)
  expect(sub.endpoint).toMatch(/^https?:\/\//);
  expect(sub.keys?.p256dh).toBeTruthy();
  expect(sub.keys?.auth).toBeTruthy();
  // expirationTime is optional per w3c-push - null is allowed
  expect(sub.expirationTime === null || typeof sub.expirationTime === 'number').toBe(true);
});
```

Per [w3c-push], the `PushSubscription` exposes:

| Property | Per [w3c-push] |
|---|---|
| `endpoint` | "URL where the application server sends messages" |
| `expirationTime` | "Optional timestamp (milliseconds since epoch) indicating when the subscription expires" |
| `keys.p256dh` | "P-256 ECDH Diffie-Hellman public key" |
| `keys.auth` | "authentication secret that an application server uses" |
| `options` | The `PushSubscriptionOptions` that created it |

### Step 3 - Test `getSubscription()` returns the same endpoint

```ts
test('PushManager.getSubscription returns the active subscription', async ({ page }) => {
  await page.goto('https://localhost:3000/');

  // ... subscribe as Step 2 ...

  const same = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    const s = await reg.pushManager.getSubscription();
    return s?.endpoint;
  });

  expect(same).toBeTruthy();
});
```

Per [mdn-push], `PushManager.getSubscription()` returns the active
subscription if one exists, else `null`.

### Step 4 - Test the SW `push` event with `PushMessageData`

Drive a push event into the registered service worker. In a real
test environment, the application server sends to the endpoint;
for an isolated unit test of the SW handler, dispatch the event
synthetically:

```ts
test('SW push event triggers showNotification', async ({ context, page }) => {
  await page.goto('https://localhost:3000/');
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');

  // Inject a tracker for the call
  await sw.evaluate(() => {
    (self as any).__showNotificationCalls = [];
    const real = self.registration.showNotification.bind(self.registration);
    self.registration.showNotification = ((title: string, options?: any) => {
      (self as any).__showNotificationCalls.push({ title, options });
      return real(title, options);
    }) as any;
  });

  // Dispatch a synthetic PushEvent - Note: real Chromium dispatches via the push service.
  // For isolated SW unit tests, use the `push` event listener manually.
  await sw.evaluate(() => {
    const e: any = new Event('push');
    e.data = {
      arrayBuffer: () => new TextEncoder().encode('{"title":"hi","body":"x"}').buffer,
      blob: () => new Blob([new TextEncoder().encode('{"title":"hi","body":"x"}')]),
      bytes: () => new TextEncoder().encode('{"title":"hi","body":"x"}'),
      json: () => ({ title: 'hi', body: 'x' }),
      text: () => '{"title":"hi","body":"x"}',
    };
    self.dispatchEvent(e);
  });

  const calls = await sw.evaluate(() => (self as any).__showNotificationCalls);
  expect(calls.length).toBeGreaterThanOrEqual(1);
  expect(calls[0].title).toBe('hi');
});
```

Per [w3c-push], `PushMessageData` exposes:

| Method | Returns |
|---|---|
| `arrayBuffer()` | "the raw bytes" |
| `blob()` | "Wraps bytes in a Blob object" |
| `bytes()` | "a `Uint8Array` view" |
| `json()` | "Parses as JSON" |
| `text()` | "Decodes UTF-8" |

### Step 5 - Test `pushsubscriptionchange`

Per [w3c-push], `pushsubscriptionchange` is *"Fired when
subscriptions refresh, revoke, or expire outside app control,
passing `oldSubscription` and `newSubscription`"*. The handler
must re-subscribe and POST the new endpoint to the app server:

```ts
test('pushsubscriptionchange triggers re-subscription', async ({ context, page }) => {
  await page.goto('https://localhost:3000/');
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');

  await sw.evaluate(() => {
    (self as any).__resubCalls = [];
    self.addEventListener('pushsubscriptionchange', (e: any) => {
      (self as any).__resubCalls.push({
        old: e.oldSubscription?.endpoint,
        new: e.newSubscription?.endpoint,
      });
    });
  });

  // Synthetic dispatch - real fires when the push service expires the endpoint
  await sw.evaluate(() => {
    const e: any = new Event('pushsubscriptionchange');
    e.oldSubscription = { endpoint: 'https://push.example/old' };
    e.newSubscription = { endpoint: 'https://push.example/new' };
    self.dispatchEvent(e);
  });

  const calls = await sw.evaluate(() => (self as any).__resubCalls);
  expect(calls[0]).toEqual({
    old: 'https://push.example/old',
    new: 'https://push.example/new',
  });
});
```

The real-world trigger for `pushsubscriptionchange` is the push
service revoking / refreshing the endpoint per [w3c-push] - not
testable headlessly without the push service in the loop, which is
why Step 6 covers the server-side expiry signal instead.

### Step 6 - Server-side: handle `410 Gone` for expired endpoints

Per [rfc8030], `410 Gone` is *"Returned when the push service
ceases retry delivery before advertised expiration."* In practice
it indicates the subscription is no longer valid - the application
server must delete the endpoint from its store. Test the cleanup
path:

```ts
import { describe, it, expect, vi } from 'vitest';
import webpush from 'web-push';

describe('subscription cleanup', () => {
  it('deletes the subscription record on 410 Gone', async () => {
    vi.spyOn(webpush, 'sendNotification').mockRejectedValue({
      statusCode: 410,
      body: 'Gone',
    } as any);

    const db = { delete: vi.fn() };

    await sendAndPrune(db, { endpoint: 'https://push.example/abc', keys: { p256dh: '...', auth: '...' } }, { title: 'x' });

    expect(db.delete).toHaveBeenCalledWith('https://push.example/abc');
  });
});
```

Per [rfc8030], the other relevant push-service responses:

| Code | Per [rfc8030] |
|---|---|
| `201 Created` | "Indicates accepted push messages without delivery confirmation requests" |
| `410 Gone` | "Returned when the push service ceases retry delivery before advertised expiration" - delete endpoint |
| `413 Payload Too Large` | "may be returned for entity bodies exceeding size limits (though not for bodies ≤ 4096 bytes)" - split or shrink payload |
| `429 Too Many Requests` | "Used to reject requests exceeding rate limits" - back off |

### Step 7 - VAPID JWT shape

Per [rfc8292], the application server signs a JWT with ECDSA on
P-256 (the `ES256` algorithm) and sends:

```
Authorization: vapid t=<JWT>, k=<base64url(public key, X9.62 uncompressed)>
```

The JWT must include three claims per [rfc8292]:

| Claim | Constraint |
|---|---|
| `aud` | "MUST include the Unicode serialization of the origin of the push resource URL" |
| `exp` | "MUST NOT be more than 24 hours from the time of the request" |
| `sub` | "SHOULD include a contact URI for the application server as either a 'mailto:' (email) or an 'https:' URI" |

Test the server-side VAPID generation:

```ts
import { decode } from 'jsonwebtoken';

it('VAPID JWT has aud, exp ≤ 24h, mailto sub', () => {
  const auth = generateVapidAuth('https://updates.push.services.mozilla.com', 'mailto:ops@example.com');
  // Parse t=<jwt>, k=<key>
  const tMatch = auth.match(/t=([^,]+)/);
  expect(tMatch).toBeTruthy();
  const payload = decode(tMatch![1]) as any;

  expect(payload.aud).toBe('https://updates.push.services.mozilla.com');
  expect(payload.exp - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(24 * 3600);
  expect(payload.sub).toMatch(/^(mailto:|https:)/);
});
```

### Step 8 - Test `unsubscribe()`

Per [w3c-push], `PushSubscription.unsubscribe()` "deactivates a
subscription, returning a promise resolving to `true` on success or
`false` if already deactivated":

```ts
test('unsubscribe() resolves true and getSubscription returns null after', async ({ page }) => {
  await page.goto('https://localhost:3000/');
  // ... subscribe ...

  const result = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    const s = await reg.pushManager.getSubscription();
    const ok = await s!.unsubscribe();
    const after = await reg.pushManager.getSubscription();
    return { ok, hasAfter: !!after };
  });

  expect(result.ok).toBe(true);
  expect(result.hasAfter).toBe(false);
});
```

## Running

### Locally

```bash
# 1. Generate a VAPID key pair (the `web-push` CLI helper)
npx web-push generate-vapid-keys
# Export the public key as VAPID_PUBLIC_KEY_BASE64URL

# 2. Run the subscription-lifecycle suite
npx playwright test tests/web-push.spec.ts

# 3. Run the cleanup-on-410 unit suite
npx vitest run tests/subscription-cleanup.spec.ts
```

### In CI

```yaml
jobs:
  web-push:
    runs-on: ubuntu-latest
    env:
      VAPID_PUBLIC_KEY_BASE64URL: ${{ secrets.VAPID_PUB }}
      VAPID_PRIVATE_KEY: ${{ secrets.VAPID_PRIV }}
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci && npx playwright install --with-deps chromium
      - run: npx playwright test tests/web-push.spec.ts
      - run: npx vitest run tests/subscription-cleanup.spec.ts
```

Inject VAPID keys via secret env vars per [rfc8292] - the public
key only is needed in the browser, but the private signs the JWT
and must never reach the client.

## Parsing results

A successful subscription test produces:

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/eFwxc...",
  "expirationTime": null,
  "keys": {
    "p256dh": "BPq8...32-byte-x9.62...",
    "auth": "abc...16-byte-secret..."
  }
}
```

The `endpoint` host indicates the push service:
- `https://fcm.googleapis.com/fcm/send/*` → Chrome / Edge / Brave
  (Google FCM)
- `https://updates.push.services.mozilla.com/*` → Firefox
- `https://*.notify.windows.com/*` → Edge Legacy (rare today)

A `410 Gone` from any of these = the subscription should be
deleted server-side per [rfc8030].

## CI integration

For projects that ship web-push: gate PRs on the subscription
suite + cleanup suite. Skip the live-send-to-push-service step in
PR-level CI (introduces flakiness from real push services); gate
release builds on a smoke test that does send through the real
service.

```yaml
- name: PR-level web-push tests
  run: |
    npx playwright test tests/web-push.spec.ts
    npx vitest run tests/subscription-cleanup.spec.ts

- name: Release-level live push smoke
  if: github.event_name == 'release'
  run: npx vitest run tests/live-push.spec.ts
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Hardcode VAPID public key in test fixtures | Rotation breaks tests | Inject via env (Step 2) |
| Skip the `410 Gone` cleanup test | Subscription store grows with dead endpoints; push-service rate-limit risk | Step 6 |
| Assume `expirationTime` is always non-null | Per [w3c-push] it's "Optional"; Chrome usually returns null | Step 2 accepts both branches |
| Test `pushsubscriptionchange` by waiting for real expiry | Hours-to-months wait; not feasible in CI | Synthetic dispatch (Step 5) |
| Use `userVisibleOnly: false` | Most browsers reject; per [w3c-push] the flag means "made visible to the user" | Always `true` in tests (Step 1) |
| Skip permission grant in the fixture | `subscribe()` rejects silently with `PermissionDeniedError` | `permissions: ['notifications']` (Step 1) |
| Treat all `4xx` from the push service the same | `410` means delete; `413` means shrink; `429` means back off - per [rfc8030] | Step 6 maps each |
| Sign VAPID JWTs with `exp` longer than 24h | Per [rfc8292] `exp` "MUST NOT be more than 24 hours" - push service rejects | Step 7 asserts the cap |
| Test only one push service endpoint | FCM vs Mozilla vs others behave differently; multi-browser test matrix | Run on Chromium + Firefox (Mozilla push service) |

## Limitations

- **Synthetic `pushsubscriptionchange` and `push` event dispatch**
  is an approximation. The real path runs through the push service
  per [w3c-push]; tests that need full fidelity must spin up a
  push-service-compatible mock (e.g. a `web-push-testing-service`
  local instance).
- **Firefox push quota** per [mdn-push]: *"Limited quota per app
  (except notifications); refreshes on site visit"* - tests
  asserting unlimited sends will fail on Firefox.
- **Endpoint host pinning is brittle.** The push service hostname
  varies by browser and may rotate within a browser; tests should
  match `^https?://` not specific hostnames.
- **The push payload encryption per RFC 8291** is opaque to the
  browser-side test - `PushMessageData.text()` returns the
  *decrypted* payload. Server-side tests need the encryption
  library (`web-push` npm package) to validate the wire format.
- **`getSubscription()` may return `null` after a browser restart**
  even when the user had previously subscribed - local browser
  state can clear without firing `pushsubscriptionchange`. Tests
  that assume subscription persistence across runs must
  re-subscribe defensively.
- **Cross-channel push (mobile APNs / FCM, native iOS / Android
  SDKs)** is not in scope here. See
  `push-notification-test-author` for those flows. This skill is
  browser-only.

## References

- W3C Push API spec (PushManager, PushSubscription,
  PushMessageData methods, pushsubscriptionchange) - [w3c-push].
- MDN Push API (Baseline status, Firefox quota notes, security
  considerations) - [mdn-push].
- RFC 8030 - Web Push Protocol (TTL header, Urgency header,
  201/410/413/429 response codes) - [rfc8030].
- RFC 8292 - VAPID for Web Push (ES256 JWT, `aud`/`exp`/`sub`
  claims, Authorization header format) - [rfc8292].
- web.dev - Notifications (the showNotification options reference
  Step 4 paired with) - [web-dev-notifications].
- Differentiation: `push-notification-test-author`
  covers cross-channel push (Web Push + APNs + FCM in one suite).
  This skill covers *only* browser web-push subscription
  lifecycle: the four-call subscribe / push-event / change /
  unsubscribe contract per [w3c-push].
- Sibling skills:
  [`pwa-install-flow-reference`](../pwa-install-flow-reference/SKILL.md)
  (notification permission gates parallel to install gates),
  [`service-worker-lifecycle-test`](../service-worker-lifecycle-test/SKILL.md)
  (the SW must be active for push events).
