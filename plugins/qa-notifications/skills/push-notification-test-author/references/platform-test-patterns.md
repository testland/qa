# Push platform test patterns

Full per-platform test-pattern code for [push-notification-test-author](../SKILL.md). Each recipe mocks at the SDK boundary (the default isolation level); swap for sandbox / emulator when verifying provider-side behavior.

## Web Push (Node.js with web-push)

Flow per IETF RFC 8030:

1. User-agent subscribes via `pushManager.subscribe()` -> returns subscription `(endpoint, keys.p256dh, keys.auth)`.
2. Application server sends push via the endpoint, encrypted per RFC 8291 + signed via VAPID per RFC 8292.
3. Push service delivers to user-agent.
4. Service worker `push` event fires -> typically calls `self.registration.showNotification()`.

Status code `410 Gone` means the subscription is invalid (user revoked or expired); the app must remove it from storage.

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

### Service-worker side test

In a service-worker test harness (sw-toolbox-test or workbox-cli's testing utilities):

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

## APNs (Python with httpx + apns2)

Run against `api.sandbox.push.apple.com` with a development APNs certificate or Auth Key (`.p8` file).

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

Invalid-token handling (HTTP 410 from APNs):

```python
def test_apns_410_removes_token():
    with patch("my_app.notifications.apns_client.send") as mock_send:
        mock_send.return_value = {"status": 410, "reason": "Unregistered"}

        send_apns_with_cleanup(device_token="abc123", ...)

        token = DeviceToken.objects.filter(token="abc123").first()
        assert token is None
```

## FCM (Node.js with firebase-admin)

Use the HTTP v1 API for new code (legacy HTTP API is deprecated). Invalid-token responses include `messaging/registration-token-not-registered`; test the cleanup path the same way as APNs.

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
