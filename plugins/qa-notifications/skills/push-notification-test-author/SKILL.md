---
name: push-notification-test-author
description: "Build-an-X for push-notification tests across Web Push (RFC 8030 / VAPID), Apple Push Notification Service (APNs), and Firebase Cloud Messaging (FCM) - covers subscription handshake, payload encryption, badge / sound / click-action assertions, expired-subscription handling, silent-vs-alert push, topic-vs-targeted routing. Use when authoring tests for any push-notification flow."
rating: 22
d6: 4
archetype: S3
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

## Step 1 - Choose the test isolation level

| Level | Example | Tradeoffs |
|---|---|---|
| Mock the SDK | Patch FCM/APNs/Web-Push library send method | Fast; misses provider-side behavior |
| Sandbox / emulator | APNs sandbox, FCM emulator (limited), web-push test browser | Realistic; slower |
| End-to-end with test devices | Real device farm | Highest fidelity; expensive + flaky |

**Default: mock the SDK** - fast, deterministic, covers payload-shape + error-path logic which is most of what regressions hit. Use sandbox/emulator when verifying provider-side behavior (encryption, rate-limit, real 410 handling); use real device farms only for grouped-notification / channel UX work.

## Step 2 - Web Push tests

Per IETF RFC 8030 (Web Push Protocol), the flow:

1. User-agent subscribes via `pushManager.subscribe()` → returns
   subscription `(endpoint, keys.p256dh, keys.auth)`.
2. Application server sends push via the endpoint, encrypted per
   RFC 8291 + signed via VAPID per RFC 8292.
3. Push service delivers to user-agent.
4. Service worker `push` event fires → typically calls
   `self.registration.showNotification()`.

**Test pattern (Node.js with web-push):**

```javascript
const webPush = require('web-push');
const { jest } = require('@jest/globals');

describe('push notification', () => {
  beforeAll(() => {
    webPush.setVapidDetails(
      'mailto:test@example.com',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY,
    );
  });

  it('sends order-status notification with correct payload', async () => {
    const sendSpy = jest.spyOn(webPush, 'sendNotification').mockResolvedValue({
      statusCode: 201,
    });

    await pushOrderUpdate(testSubscription, { orderId: 123, status: 'shipped' });

    expect(sendSpy).toHaveBeenCalledWith(
      testSubscription,
      expect.stringContaining('"orderId":123'),
      expect.any(Object),
    );
  });

  it('removes expired subscription on 410 response', async () => {
    jest.spyOn(webPush, 'sendNotification').mockRejectedValue({ statusCode: 410 });

    await pushOrderUpdate(testSubscription, { orderId: 123 });

    const stored = await Subscription.findOne({ endpoint: testSubscription.endpoint });
    expect(stored).toBeNull();
  });
});
```

Per RFC 8030, status code `410 Gone` means the subscription is
invalid (user revoked or expired); the app must remove it from
storage.

**Service-worker side test** (in a service-worker test harness like
sw-toolbox-test or workbox-cli's testing utilities):

```javascript
self.addEventListener('push', event => {
  event.waitUntil(
    self.registration.showNotification('Order update', {
      body: event.data.json().status,
      icon: '/icons/order.png',
      data: { orderId: event.data.json().orderId },
    })
  );
});

// Test: simulate push event
const event = { data: { json: () => ({ orderId: 123, status: 'shipped' }) } };
self.dispatchEvent(new PushEvent('push', event));
expect(self.registration.showNotification).toHaveBeenCalled();
```

## Step 3 - APNs tests

Apple Push Notification Service has two environments per
[developer.apple.com/documentation/usernotifications][apns-docs]:

[apns-docs]: https://developer.apple.com/documentation/usernotifications

| Environment | Use |
|---|---|
| `api.sandbox.push.apple.com` | Development; uses development APNs certificate |
| `api.push.apple.com` | Production |

Tests typically run against sandbox + use a development APNs
certificate or Auth Key (`.p8` file).

**Test pattern (Python with httpx + apns2):**

```python
import pytest
from unittest.mock import patch
from my_app.notifications import send_apns

def test_apns_payload_shape():
    with patch("my_app.notifications.apns_client.send") as mock_send:
        mock_send.return_value = {"status": 200}

        send_apns(device_token="abc123", title="Order shipped", body="Your order is on the way")

        sent_payload = mock_send.call_args.kwargs["payload"]
        assert sent_payload["aps"]["alert"]["title"] == "Order shipped"
        assert sent_payload["aps"]["alert"]["body"] == "Your order is on the way"
        assert sent_payload["aps"]["sound"] == "default"
```

For invalid-token handling (HTTP 410 from APNs):

```python
def test_apns_410_removes_token():
    with patch("my_app.notifications.apns_client.send") as mock_send:
        mock_send.return_value = {"status": 410, "reason": "Unregistered"}

        send_apns_with_cleanup(device_token="abc123", ...)

        token = DeviceToken.objects.filter(token="abc123").first()
        assert token is None
```

## Step 4 - FCM tests

Firebase Cloud Messaging supports HTTP v1 API + legacy HTTP API.
Use HTTP v1 for new code (legacy deprecated).

**Test pattern (Node.js with firebase-admin):**

```javascript
const admin = require('firebase-admin');
const { jest } = require('@jest/globals');

it('sends FCM message with correct shape', async () => {
  const sendSpy = jest.spyOn(admin.messaging(), 'send').mockResolvedValue('msg-id-123');

  await sendFcmOrderUpdate('device-token', { orderId: 123 });

  expect(sendSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      token: 'device-token',
      notification: expect.objectContaining({ title: 'Order Update' }),
      data: expect.objectContaining({ orderId: '123' }),
      android: expect.objectContaining({ priority: 'high' }),
      apns: expect.any(Object),    // FCM cross-platform routing
    }),
  );
});
```

Invalid-token responses from FCM include `messaging/registration-token-not-registered`;
test the cleanup path same as APNs Step 3.

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
XCUITest); cross-ref [`appium-testing`](../../qa-mobile-native/skills/appium-testing/SKILL.md).

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
  XCUITest); see qa-mobile-native plugins.
- iOS notification permissions UI flow is OS-managed; tests cover
  app-side request + handle response.

## References

- IETF RFC 8030 - Web Push Protocol
- IETF RFC 8291 - Message Encryption for Web Push
- IETF RFC 8292 - VAPID for Web Push
- [apns-docs][apns-docs] - Apple Push Notification Service
- firebase.google.com/docs/cloud-messaging - Firebase Cloud Messaging
- web.dev/explore/notifications - Push API + Notifications API
- npmjs.com/package/web-push - Node.js web-push library
- pypi.org/project/apns2 - Python APNs HTTP/2 library
- [`email-flow-test-author`](../email-flow-test-author/SKILL.md),
  [`sms-test-author`](../sms-test-author/SKILL.md) - sister channels
- [`appium-testing`](../../qa-mobile-native/skills/appium-testing/SKILL.md),
  [`xcuitest-suite`](../../qa-mobile-native/skills/xcuitest-suite/SKILL.md),
  [`espresso-suite`](../../qa-mobile-native/skills/espresso-suite/SKILL.md) - device-side click-action verification
