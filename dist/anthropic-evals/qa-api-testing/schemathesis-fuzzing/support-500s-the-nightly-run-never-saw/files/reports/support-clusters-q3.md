# Q3 support clusters - eleven tickets, three clusters, all open

| Cluster | Tickets | What the customer sees                                  |
|---------|---------|---------------------------------------------------------|
| A       | 5       | Label purchase fails outright, 500                      |
| B       | 4       | Label comes back with no tracking number                |
| C       | 2       | The partner's retry of a purchase 500s                  |

## Cluster A - INC-4471, 2026-08-19, 40 minutes of failed label purchases

A freight partner posts document envelopes, which legitimately weigh nothing, so
`weight_kg` is 0. Every one of those requests returns 500. Our published request
schema allows it - `weight_kg` is declared `minimum: 0`. The handler divides by
`weight_kg` when computing the dimensional-weight surcharge.

Reduced to:

    curl -X POST https://staging.kestrel.dev/v1/shipments \
      -H 'Content-Type: application/json' \
      -d '{"weight_kg": 0, "destination": {"postcode": "A"}}'

500 on staging and on production. Nothing has changed in that handler since May.

## Cluster B - four tickets since 2026-07-02

`GET /v1/labels/{id}` returns HTTP 200 with `tracking_number` absent from the
body whenever the carrier's tracking callback has not landed yet, which is most
of the first 90 seconds after purchase. The document marks `tracking_number`
required on the 200 response. Two integrators have now shipped their own
support-visible bugs on the back of it - one renders an empty tracking link,
one throws on the missing key and drops the order.

The response is a 200 every time. `Content-Type: application/json` every time.
Nothing anywhere in this cluster is a 5xx.

## Cluster C - two tickets, 2026-08-30 and 2026-09-04

The partner's retry logic re-posts `POST /v1/labels` with the same
`Idempotency-Key` header - a UUID they generate per purchase - when our response
is slow. The first POST returns 201. A second POST carrying that same key
returns 500: the replay path reads the stored response row before it has
committed.

A single POST with a fresh key is always fine. We have never reproduced it
without issuing the first request first, and the key has to be byte-identical.

## Job history

214/214 green as of last night. The job has never reported a failure of any
kind. It has never been red since the week Dana set it up.
