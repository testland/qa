# Push platform test patterns

Full per-platform test-pattern code for [push-notification-test-author](../SKILL.md). Each recipe mocks at the SDK boundary (the default isolation level); swap for sandbox / emulator when verifying provider-side behavior.

## Web Push (Node.js with web-push)

The RFC 8030 flow and the `410 Gone` cleanup requirement are covered in [Step 2 of the skill](../SKILL.md); the recipe below mocks `webPush.sendNotification` at the SDK boundary.

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

## Payload variants

### Silent (background) push - APNs

A background notification's `aps` holds only `content-available: 1`,
and the request carries `apns-push-type: background` and
`apns-priority: 5` ([pushing background updates][apns-bg]).

```javascript
it('builds a background sync push', () => {
  const { payload, headers } = buildSilentSyncPush({ since: 42 });
  expect(payload.aps).toEqual({ 'content-available': 1 });   // nothing user-facing
  expect(payload.since).toBe(42);
  expect(headers['apns-push-type']).toBe('background');
  expect(headers['apns-priority']).toBe('5');
});
```

### Deep link

```python
def test_order_push_deep_links_to_order_screen():
    payload = build_order_push(order_id=123)
    assert payload["data"]["route"] == "/orders/123"

def test_deep_link_uses_the_order_id():
    assert build_order_push(order_id=7)["data"]["route"] == "/orders/7"
```

The second case catches a builder that returns a constant route.

### FCM topic routing

```javascript
it('subscribes the device to the order-updates topic it later sends to', async () => {
  const subscribe = jest.spyOn(admin.messaging(), 'subscribeToTopic')
    .mockResolvedValue({ successCount: 1, failureCount: 0, errors: [] });
  const send = jest.spyOn(admin.messaging(), 'send').mockResolvedValue('projects/p/messages/1');

  await subscribeToOrderUpdates('device-token-1', 'user-9');
  await broadcastOrderUpdate('user-9', { status: 'shipped' });

  expect(subscribe).toHaveBeenCalledWith(['device-token-1'], 'order-updates-user-9');
  expect(send.mock.calls[0][0].topic).toBe('order-updates-user-9');
  expect(send.mock.calls[0][0].token).toBeUndefined();
});
```

`subscribeToTopic(tokens, topic)` and `send(message)` are the
firebase-admin Messaging methods; a message names exactly one of
`token`, `topic` or `condition` ([FCM send docs][fcm-send]).

[apns-bg]: https://developer.apple.com/documentation/usernotifications/pushing-background-updates-to-your-app
[fcm-send]: https://firebase.google.com/docs/cloud-messaging/send-message
