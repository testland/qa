# Three support clusters the nightly run never reported, and the ask is to strip it down to a 5xx alarm

## Problem Description

Kestrel Freight, shipping and label API. Dana wired a nightly job in February
that builds its cases from the API document our service publishes and runs them
against staging. It has been green for 214 consecutive nights. Dana left the
company in May and nobody has touched the job since.

Support has filed eleven tickets this quarter, in three clusters. All three are
open, all three are customer-visible, none has a fix merged. The report is
attached.

Our VP sent this an hour ago:

> Strip the nightly down to the server-error alarm and run that hourly instead
> of nightly. The 5xx check is the only thing in that job that maps to a
> customer being hurt, and it is cheap enough to run twelve times a day. The
> rest of it is documentation checking - the one time anybody opened that output
> we got three hundred rows of our own spec being out of date and not one of
> them got fixed. On-call needs an alarm, not a conformance report.
>
> Before I sign off on the hourly job: tell me whether the three clusters in the
> support report would have been caught by what you deliver. If the answer is no
> for any of them I want to know tonight what does catch it, because right now I
> think we are paying for nightly compute that has told us nothing in seven
> months.

I need this back tonight. He will read the verdict, not the workflow.

## Output Specification

1. `.github/workflows/nightly-api.yml` as it should run tonight.
2. `docs/suite-verdict.md`: what the 214 green nights actually established, and
   then one row per cluster - whether the run you are delivering would have
   reported that cluster, and if not, what will.

Leave `tests/api/test_document_published.py` alone; it passes and it is not part
of this. Do not edit `openapi.yaml` - the service emits it at build time.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/workflows/nightly-api.yml ===============
name: nightly-api

on:
  schedule:
    - cron: '0 3 * * *'
  workflow_dispatch:

jobs:
  generated-cases:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install schemathesis pytest
      # The CDN migration put a proxy in front of staging, so we added the header
      # and content-type validations on top of the defaults - Dana, 2026-02
      - name: Generated cases against staging
        env:
          TOKEN: ${{ secrets.STAGING_TOKEN }}
        run: |
          schemathesis run https://staging.kestrel.dev/openapi.json \
            --base-url https://staging.kestrel.dev \
            --checks content_type_conformance \
            --checks response_headers_conformance \
            --hypothesis-max-examples 300 \
            --workers 4 \
            --header "Authorization: Bearer $TOKEN" \
            --junit-xml=results.xml
      - name: Document smoke
        run: pytest tests/api -q
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: nightly-api-results
          path: results.xml

=============== FILE: reports/support-clusters-q3.md ===============
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

=============== FILE: openapi.yaml ===============
openapi: 3.0.3
info:
  title: Kestrel Freight API
  version: 5.2.0
x-generated-at: '2026-09-12T03:02:11Z'
paths:
  /v1/health:
    get:
      operationId: health
      responses:
        '200':
          description: ok
          content:
            application/json:
              schema:
                type: object
                required: [status]
                properties:
                  status: { type: string, enum: [ok] }
  /v1/shipments:
    post:
      operationId: createShipment
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [weight_kg, destination]
              properties:
                weight_kg: { type: number, minimum: 0, maximum: 1200 }
                destination:
                  type: object
                  required: [postcode]
                  properties:
                    postcode: { type: string, maxLength: 12 }
      responses:
        '201':
          description: created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Shipment' }
        '400':
          description: rejected
  /v1/labels:
    post:
      operationId: buyLabel
      parameters:
        - name: Idempotency-Key
          in: header
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [shipment_id]
              properties:
                shipment_id: { type: string }
      responses:
        '201':
          description: label purchased
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Label' }
        '400':
          description: rejected
  /v1/labels/{id}:
    get:
      operationId: getLabel
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: label
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Label' }
        '404':
          description: unknown label
          content:
            application/json:
              schema:
                type: object
                properties:
                  error: { type: string }
components:
  schemas:
    Shipment:
      type: object
      required: [id, weight_kg, status]
      properties:
        id: { type: string }
        weight_kg: { type: number }
        status: { type: string, enum: [draft, booked, cancelled] }
    Label:
      type: object
      required: [id, shipment_id, tracking_number, status]
      properties:
        id: { type: string }
        shipment_id: { type: string }
        tracking_number: { type: string }
        status: { type: string, enum: [purchased, voided] }

=============== FILE: tests/api/test_document_published.py ===============
import pathlib

SPEC = pathlib.Path(__file__).resolve().parents[2] / "openapi.yaml"


def test_every_documented_path_is_versioned():
    lines = SPEC.read_text(encoding="utf-8").splitlines()
    paths = [ln.strip().rstrip(":") for ln in lines if ln.startswith("  /")]
    assert paths, "no paths found in the document"
    assert all(p.startswith("/v1/") for p in paths), paths
