# Captured failure output, last 30 days

## payment capture succeeds — 26 failures

All 26 failures share the same output:

    Error: expect(received).toHaveText(expected)
    Expected: "captured"
    Received: "failed"
      at tests/payments.spec.ts:9

Network log attached to each failure shows the same upstream response:

    POST /api/v1/payments/capture -> 503 Service Unavailable
    x-upstream: pay-gateway-eu-3
    body: {"error":"acquirer_timeout","retryable":true}

The 503s cluster: 21 of the 26 fell between 18:00 and 20:00 UTC.

## payment page renders card form — 19 failures

All 19 failures share the same output:

    TimeoutError: locator.waitFor: Timeout 5000ms exceeded.
    waiting for frameLocator('#card').getByLabel('Card number')

No failing network calls in any of the 19. The card iframe finishes loading
between 4.6s and 7.1s on the tablet-768 project; the assertion waits 5s.
Chromium loads it in under 2s and has never failed.
