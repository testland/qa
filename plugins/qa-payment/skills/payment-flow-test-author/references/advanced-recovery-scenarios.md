# Webhook order-tolerance, partial-failure, and archive-replay scenarios

Deep reference for `payment-flow-test-author` SKILL.md. Consult once the core
signature + idempotency + replay-simulator surface is in place and the suite
needs the harder recovery scenarios: out-of-order delivery, mid-handler crash
recovery, replay of old events from the gateway archive, and the per-gateway
suite layout.

## Order-tolerance tests

Webhooks can arrive out of order:

```typescript
test('out-of-order event delivery handled', async () => {
  const completedEvent = makeEvent({ type: 'payment_intent.succeeded' });
  const creatingEvent = makeEvent({ type: 'payment_intent.created' });

  // Deliver completed BEFORE created
  await postWebhook(completedEvent);
  await postWebhook(creatingEvent);

  // Final state should still be correct
  const record = await db.payments.findOne({ intent_id: completedEvent.data.id });
  expect(record.status).toBe('succeeded');
});
```

The handler must use **versioned events** or **state-machine gates** to handle
this:

```python
# Don't blindly overwrite state
def handle_event(event):
    record = db.payments.get(event.intent_id)
    new_state = event.data.status
    if state_transition_allowed(record.status, new_state):
        record.status = new_state
        record.save()
    # else: stale event, ignore
```

## Partial-failure scenarios

What happens when the handler crashes mid-processing?

```typescript
test('crash mid-processing → retry succeeds', async () => {
  let crashOnce = true;
  const handler = makeHandler({
    onProcessEvent: () => {
      if (crashOnce) {
        crashOnce = false;
        throw new Error('simulated crash');
      }
    },
  });

  await expect(handler.process(event)).rejects.toThrow();  // First attempt crashes
  await handler.process(event);  // Retry succeeds; idempotent

  const record = await db.payments.findOne({ event_id: event.id });
  expect(record).toBeTruthy();
});
```

Handlers should commit state changes atomically - either the processing
succeeds and the event is marked handled, or both roll back.

## Replay-from-archive

Production sometimes loses webhooks (network outage, deploy issue). Per gateway
docs, all support some form of replay:

| Gateway | Replay window | Method |
|---|---|---|
| Stripe | 30 days | `stripe events resend <event_id>` |
| Adyen | Unlimited (Customer Area) | Manual or `notification-resend` API |
| PayPal | 30 days | Webhook resend endpoint |
| Braintree | Unlimited (Control Panel) | Manual or `webhookTesting.sampleNotification` |

Test:

```typescript
test('handler accepts replay from 7-day-old event', async () => {
  const oldEvent = makeEvent({ created: Math.floor(Date.now()/1000) - 7*86400 });
  const result = await handler.process(oldEvent);
  expect(result).toBe(200);
});
```

## Suite layout

One directory per gateway so per-gateway quirks stay isolated:

```
tests/payment/webhooks/
  stripe/
    signature.test.ts
    idempotency.test.ts
    order-tolerance.test.ts
    replay.test.ts
  adyen/
    ... (same structure)
  paypal/
    ...
  braintree/
    ...
  fixtures/
    payloads/
```
