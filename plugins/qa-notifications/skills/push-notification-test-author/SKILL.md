---
name: push-notification-test-author
description: "Build-an-X for push-notification tests across Web Push (RFC 8030 / VAPID), Apple Push Notification Service (APNs), and Firebase Cloud Messaging (FCM) - covers subscription handshake, payload encryption, badge / sound / click-action assertions, expired-subscription handling, silent-vs-alert push, topic-vs-targeted routing. Use when authoring tests for any push-notification flow."
---

# push-notification-test-author

## Overview

Three push platforms dominate:

| Platform | Standard / Provider | Test approach |
|---|---|---|
| **Web Push** | IETF RFC 8030 + VAPID (RFC 8292) | Service-worker test harness + push library mocks |
| **APNs** (iOS / iPadOS / macOS) | Apple proprietary HTTP/2 | APNs sandbox environment + APNs simulator tooling |
| **FCM** (Android + cross-platform) | Google Firebase | FCM emulator (limited) + provider SDK mocks |

Each platform has distinct test patterns; this skill covers the
common workflow + per-platform specifics.

## When to use

- The repo sends push notifications via any of the three platforms.
- A regression suite needs to verify push payload shape, click
  actions, badge counts.
- Compliance review needs evidence that revoked subscriptions are
  cleaned up.
- The team integrates with FCM / APNs / Web Push directly (not
  via OneSignal-style abstractions).

## How to use

1. Identify which push platform(s) the app targets - Web Push, APNs, FCM, or a mix (Overview).
2. Pick the isolation level; default to mocking the SDK send method (Step 1).
3. Author the happy-path payload-shape test for each channel (Steps 2 - 4, [references/platform-test-patterns.md](references/platform-test-patterns.md)).
4. Add the invalid-token cleanup test for the 410 / unregistered path (Steps 2 - 4).
5. Cover silent-vs-alert, click-action deep links, and FCM topic routing (Steps 5 - 7).
6. Assert production-vs-sandbox environment routing so tests never reach real users (Step 3).
7. Run the per-channel checklist in Step 8 and reconcile against the Anti-patterns table.

## Step 1 - Choose the test isolation level

| Level | Example | Tradeoffs |
|---|---|---|
| Mock the SDK | Patch FCM/APNs/Web-Push library send method | Fast; misses provider-side behavior |
| Sandbox / emulator | APNs sandbox, FCM emulator (limited), web-push test browser | Realistic; slower |
| End-to-end with test devices | Real device farm | Highest fidelity; expensive + flaky |

**Default: mock the SDK** - fast, deterministic, covers payload-shape + error-path logic which is most of what regressions hit. Use sandbox/emulator when verifying provider-side behavior (encryption, rate-limit, real 410 handling); use real device farms only for grouped-notification / channel UX work.

## Step 2 - Web Push tests

Per IETF RFC 8030 (Web Push Protocol): the user-agent subscribes via `pushManager.subscribe()`, the app server sends an encrypted (RFC 8291) + VAPID-signed (RFC 8292) push to the returned endpoint, and the service worker's `push` event calls `self.registration.showNotification()`. Status code `410 Gone` means the subscription is invalid (user revoked or expired); the app must remove it from storage.

Mock `webPush.sendNotification` and assert payload shape plus the 410 cleanup path; add a service-worker harness test that dispatches a synthetic `PushEvent`. Full Node.js + service-worker recipes: [references/platform-test-patterns.md](references/platform-test-patterns.md).

## Step 3 - APNs tests

Apple Push Notification Service has two environments per
[developer.apple.com/documentation/usernotifications][apns-docs]:

[apns-docs]: https://developer.apple.com/documentation/usernotifications

| Environment | Use |
|---|---|
| `api.sandbox.push.apple.com` | Development; uses development APNs certificate |
| `api.push.apple.com` | Production |

Tests typically run against sandbox + use a development APNs
certificate or Auth Key (`.p8` file). Mock `apns_client.send`, assert the `aps` payload shape (alert title / body, sound), and cover the HTTP 410 (`Unregistered`) token-cleanup path. Python recipes: [references/platform-test-patterns.md](references/platform-test-patterns.md).

## Step 4 - FCM tests

Firebase Cloud Messaging supports HTTP v1 API + legacy HTTP API.
Use HTTP v1 for new code (legacy deprecated). Mock `admin.messaging().send`, assert the cross-platform message shape (`token`, `notification`, `data`, `android`, `apns`), and test the `messaging/registration-token-not-registered` cleanup path (same as APNs Step 3). Node.js recipe: [references/platform-test-patterns.md](references/platform-test-patterns.md).

## Step 5 - Silent vs alert push

- **Alert push**: shows a notification UI; user sees + taps.
  Standard pattern.
- **Silent push** (also "background push"): doesn't show UI; wakes
  the app to do background work. Apple imposes throttling on these
  per [apns-docs][apns-docs].

Tests should distinguish the two and assert correct payload:

```javascript
it('uses content-available for background sync', () => {
  const payload = buildSilentSyncPush();
  expect(payload.aps['content-available']).toBe(1);
  expect(payload.aps.alert).toBeUndefined();   // no UI for silent
});
```

## Step 6 - Click-action / deep-link tests

The push payload includes a click-action / URL that opens a
specific app screen. Test that the right deep-link is in the
payload:

```python
def test_order_push_deep_links_to_order_screen():
    payload = build_order_push(order_id=123)
    assert payload["data"]["click_action"] == "/orders/123"
```

End-to-end click-action tests require device automation (Espresso /
XCUITest); cross-ref `appium-testing` (in the qa-mobile plugin).

## Step 7 - Topic vs targeted routing

FCM supports topic subscriptions (broadcast to all subscribers of a
topic) vs targeted (single device token). Tests for topic routing:

```javascript
it('subscribes user to order-updates topic', async () => {
  const subSpy = jest.spyOn(admin.messaging(), 'subscribeToTopic')
    .mockResolvedValue({ successCount: 1, failureCount: 0, errors: [] });

  await subscribeToOrderUpdates('user-device-token', userId);

  expect(subSpy).toHaveBeenCalledWith(['user-device-token'], `user-${userId}`);
});
```

## Step 8 - End-to-end test recipe

For each push channel:

1. ✅ Happy-path send with correct payload shape (Steps 2 - 4)
2. ✅ Invalid-token cleanup on 410 / unregistered response (Steps 2 - 4)
3. ✅ Silent vs alert distinction (Step 5)
4. ✅ Click-action / deep-link assertion (Step 6)
5. ✅ Topic subscription handling (FCM, Step 7)
6. ✅ Production vs sandbox environment routing (Step 3)

## Worked example

An e-commerce app sends a Web Push "order shipped" notification and must clean up revoked subscriptions.

1. Platform: Web Push only (Overview). Isolation: mock `webPush.sendNotification` (Step 1 default).
2. Happy path: a test drives `pushOrderUpdate(sub, { orderId: 123, status: 'shipped' })` and asserts `sendNotification` was called with a payload string containing `"orderId":123`. The mock returns `{ statusCode: 201 }`; the assertion passes.
3. Revocation: a second test mocks `sendNotification` to reject with `{ statusCode: 410 }`. After `pushOrderUpdate` runs, the test asserts the subscription row is gone from storage (`Subscription.findOne(...)` returns null), proving the 410 cleanup path per RFC 8030.
4. Service-worker side: dispatch a synthetic `PushEvent` whose `data.json()` returns the order payload; assert `self.registration.showNotification` was called with body `shipped`.
5. Result: three passing tests - payload shape, 410 cleanup, and SW render - cover the whole Web Push channel. Repeat the [references/platform-test-patterns.md](references/platform-test-patterns.md) recipes for APNs / FCM if the app adds those channels.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Test only happy path | Miss expired-token cleanup; storage grows; spam to dead devices | Step 2-4 410 / 404 / unregistered tests |
| Hardcode VAPID public key in tests + checked into repo | Key rotation breaks tests | Inject via env var |
| Send to real production APNs in tests | Real users get test push | Sandbox environment (Step 3) |
| Skip silent-vs-alert distinction | Apple throttles silent push; missing flag → notifications dropped | content-available test (Step 5) |
| Skip click-action test | Deep links break silently after refactors | Step 6 |

## Limitations

- This is a build-an-X workflow. Tests use the application's chosen
  push library + mocks at the SDK boundary.
- APNs sandbox has rate limits; high-volume CI may need to mock vs
  real sandbox.
- FCM emulator coverage is limited; many provider-side behaviors
  require real FCM (sandbox / dev project).
- Push-notification UX (e.g., grouped notifications, notification
  channels on Android) requires device-side testing (Espresso /
  XCUITest); see qa-mobile plugins.
- iOS notification permissions UI flow is OS-managed; tests cover
  app-side request + handle response.

## References

- [references/platform-test-patterns.md](references/platform-test-patterns.md) - full Web Push / APNs / FCM test-pattern code
- IETF RFC 8030 - Web Push Protocol
- IETF RFC 8291 - Message Encryption for Web Push
- IETF RFC 8292 - VAPID for Web Push
- [apns-docs][apns-docs] - Apple Push Notification Service
- firebase.google.com/docs/cloud-messaging - Firebase Cloud Messaging
- web.dev/explore/notifications - Push API + Notifications API
- npmjs.com/package/web-push - Node.js web-push library
- pypi.org/project/apns2 - Python APNs HTTP/2 library
- `email-flow-test-author`,
  `sms-test-author` - sister channels
- `appium-testing`,
  `xcuitest-suite`,
  `espresso-suite` - device-side click-action verification
