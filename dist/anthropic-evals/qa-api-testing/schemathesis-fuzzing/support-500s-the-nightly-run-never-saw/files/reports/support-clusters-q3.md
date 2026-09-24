# Q3 support clusters - fourteen tickets, four clusters, all open

| Cluster | Tickets | What the customer reports                               |
|---------|---------|---------------------------------------------------------|
| A       | 5       | Label purchase fails outright, HTTP 500                 |
| B       | 4       | Shipment is created but comes back with no tracking number |
| C       | 2       | The partner's retry of a purchase returns HTTP 500      |
| D       | 3       | "Your rates endpoint is 500ing" - three integrators, same words |

## Cluster A - INC-4471, 2026-08-19, 40 minutes of failed purchases

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

`POST /v1/shipments` returns HTTP 201 with `tracking_number` absent from the
body whenever the carrier's tracking reservation has not come back in time,
which is most of the first 90 seconds of a carrier's morning window. The
document marks `tracking_number` required on the 201 response. Two integrators
have now shipped their own support-visible bugs on the back of it - one renders
an empty tracking link, one throws on the missing key and drops the order.

Status is 201 every time. `Content-Type: application/json` every time.

## Cluster C - two tickets, 2026-08-30 and 2026-09-04

The partner's retry logic re-posts `POST /v1/labels` with the same
`Idempotency-Key` header - a UUID they generate per purchase - when our response
is slow. The first POST returns 201. A second POST carrying that same key
returns 500: the replay path reads the stored response row before it has
committed.

A single POST with a fresh key is always fine. We have never reproduced it
without issuing the first request first.

## Cluster D - three tickets, 2026-09-01 to 2026-09-09

Three integrators independently report that `GET /v1/rates` is "returning 500s".
It is not. We checked the edge logs for all three accounts and every one of
those requests was answered HTTP 200 with `Content-Type: application/json`.

What we return when the carrier rate service times out is:

    HTTP/1.1 200 OK
    Content-Type: application/json

    {"error": "carrier rate service unavailable"}

The document says a 200 from that operation carries a required `rates` array.
Two of the three integrators use a generated client that raises on the missing
key; their own logs record that as a 5xx and that is the number that reached
their support ticket. The third read our HTTP status correctly and filed it as
"empty rates".

## Job history

214/214 green as of last night. The job has never reported a failure of any
kind. It has never been red since the week Dana set it up.
