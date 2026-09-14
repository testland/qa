# Parcelo — Tracking webhooks (extract from the integration guide, v4.2)

Retrieved 2026-09-14 from the Parcelo developer portal, "Webhooks → Tracking
events" and "Webhooks → Verifying deliveries".

## Request format

Tracking events are delivered as an HTTP POST with
`Content-Type: application/x-www-form-urlencoded; charset=utf-8`.

A complete sample delivery, exactly as Parcelo sends it:

```
POST /hooks/parcelo HTTP/1.1
Content-Type: application/x-www-form-urlencoded; charset=utf-8
Parcelo-Delivery-Id: dlv_8f41c0b2e7
Parcelo-Timestamp: 1789123272
Parcelo-Signature: v1,rqQ4GbQdwbgkfIHOb6/vDZv0aQnrS1Ov+LHk3sbUQGE=

ShipmentId=shp_9f2c41&TrackingNumber=PRC0049182233GB&Status=in_transit&StatusDetail=Arrived+at+Bristol+depot&EventTime=2026-09-11T08%3A41%3A12Z&CarrierRef=BR-9921
```

## Parameters

| Parameter      | Always present | Notes |
|----------------|----------------|-------|
| `ShipmentId`   | yes            | Parcelo shipment identifier |
| `TrackingNumber` | yes          | Carrier tracking number |
| `Status`       | yes            | One of the values below |
| `StatusDetail` | no             | Free text, human readable |
| `EventTime`    | yes            | ISO 8601, UTC |
| `CarrierRef`   | no             | Present once a carrier has accepted the parcel |

### `Status` values

`label_created`, `in_transit`, `out_for_delivery`, `delivered`, `exception`,
`returned`.

New values may be added. Integrations must ignore a value they do not recognise
and acknowledge the delivery rather than failing it.

## Verifying deliveries

Compute `HMAC-SHA256` where:

- the key is the endpoint secret with its `whsec_` prefix removed, base64-decoded;
- the message is `{Parcelo-Delivery-Id}.{Parcelo-Timestamp}.` followed by **the
  request body exactly as transmitted, before any parsing or re-encoding**.

Base64-encode the digest and compare it, in constant time, against the value
following `v1,` in the `Parcelo-Signature` header.

Reject any delivery whose `Parcelo-Timestamp` differs from your own clock by more
than 300 seconds.

## Delivery and retries

Parcelo waits 3 seconds for a response. A non-2xx response or a timeout is
retried for up to 24 hours. A delivery may be sent more than once; the
`Parcelo-Delivery-Id` is stable across retries of the same delivery.
