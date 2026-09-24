# Every cart case comes back 401 or 404, and there are two proposals for making that stop

## Problem Description

Redgate Market, checkout API. The nightly job that builds its cases from our
API document and runs them against staging has been red every night since
2026-09-02, when platform rotated the staging auth. 18 of our 22 operations are
failing. The run report from last night is attached.

Two proposals landed on me this morning and I need to come back to both of them
today.

Marek, who leads platform, wants to declare the unauthorised response on the
operations that do not currently declare it:

> Every one of those failures is the run complaining that a 401 came back on an
> operation where our document does not list a 401. That is our document being
> wrong, not the API. We do return 401 there - any client without a token gets
> one. I did exactly this to three operations on 18 August when they started
> failing for the same reason and they have been green every night since. It is
> a ten-minute change and it takes the whole nightly green tonight.

Whitney, who owns ordering, wants coverage she has been asking for since March:

> The nightly has never once touched the flow that actually earns money. Add to
> cart, price it, check out, confirm the order. Nobody has automated that and we
> shipped a pricing bug into it in July. If the nightly is generating hundreds
> of cases a night I do not understand why that flow is not one of them.

Both of them are confident. I am not. What I need from you is the nightly as it
should actually run tomorrow night, and a note I can forward to the two of them
that deals with each proposal on its own terms.

Background on the staging auth change is attached, along with the document, the
job as it stands, and the run report. `test/document-lint.test.js` passes and is
not part of this - leave it as it is.

## Output Specification

1. `.github/workflows/nightly-checkout.yml` as it should run tomorrow night.
2. `openapi.yaml`, if and only if it needs to change, with the change explained.
3. `docs/nightly-response.md` - the note to Marek and Whitney. Take each
   proposal separately, say what the 22-operation report actually establishes
   about which operations are being exercised, and for anything you are not
   delivering, say what does deliver it.

## Input Files

Extract the following files before beginning.

=============== FILE: .github/workflows/nightly-checkout.yml ===============
name: nightly-checkout

on:
  schedule:
    - cron: '0 2 * * *'
  workflow_dispatch:

jobs:
  generated-cases:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install schemathesis

      - name: Mint a staging token
        id: token
        run: |
          TOKEN=$(curl -s -X POST https://staging.redgate.dev/v1/auth/token \
            -u "$CI_USER:$CI_PASS" | python -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')
          echo "value=$TOKEN" >> "$GITHUB_OUTPUT"
        env:
          CI_USER: ${{ secrets.STAGING_CI_USER }}
          CI_PASS: ${{ secrets.STAGING_CI_PASS }}

      # 200 per operation since April. One worker - ops asked us not to open
      # four connections at staging while the seed rebuild is running.
      - name: Generated cases
        run: |
          schemathesis run https://staging.redgate.dev/openapi.json \
            --base-url https://staging.redgate.dev \
            --hypothesis-max-examples 200 \
            --header "Authorization: Bearer ${{ steps.token.outputs.value }}" \
            --junit-xml=results.xml

      - name: Document lint
        run: node --test test/*.test.js

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: nightly-checkout-results
          path: results.xml

=============== FILE: reports/nightly-2026-09-13.md ===============
# Nightly generated-case run, 2026-09-13 02:00 UTC

22 operations, 200 cases each, 4,400 requests. 38m04s wall clock. One worker.
4 passed, 18 failed.

The token this run used was minted at 00:00:00. Rows below are in run order. The
first 401 in this run was observed at 00:10:04, on row 4. Every response after
00:10:04 was a 401.

| # | Operation                     | Documented statuses | Responses observed | Result |
|---|-------------------------------|---------------------|--------------------|--------|
| 1 | `POST /v1/carts` addToCart    | 201, 400            | 149x201, 51x400    | pass   |
| 2 | `GET /v1/catalog` catalog     | 200                 | 200x200            | pass   |
| 3 | `GET /v1/carts/{id}` getCart  | 200, 404            | 200x404            | pass   |
| 4 | `POST /v1/checkout/validate`  | 200, 400, 401       | 200x401            | pass   |
| 5 | `POST /v1/checkout` checkout  | 201, 402, 409       | 200x401            | fail: status_code_conformance |
| 6 | `POST /v1/checkout/confirm`   | 200, 409            | 200x401            | fail: status_code_conformance |
| 7 | `GET /v1/promotions`          | 200, 401            | 200x401            | pass   |
| 8 | `GET /v1/shipping-options`    | 200, 401            | 200x401            | pass   |
|9-22| remaining 14 operations      | various, no 401     | 200x401 each       | fail: status_code_conformance |

## Notes carried forward from previous runs

- Rows 4, 7 and 8 are the three operations that had the unauthorised response
  added to the document on 2026-08-18. They have reported pass on all 26 runs
  since - including the 12 runs before the 2026-09-02 rotation, when the token
  was still good for 24 hours. Across all 26 runs the responses recorded for
  those three operations are 401 on every request. No run has recorded a 2xx, a
  400 or any other status from them. Platform's note on the August ticket says
  the CI service account was never granted `promotions:read`,
  `shipping:read` or `checkout:validate`, which is why those three answered 401
  while the rest of the suite was still green. Row 4 is the one of the three
  that ran before 00:10:04, while the token was still live.
- Row 3, `getCart`, has reported pass on every run since the job was created in
  April. The identifier in each case is generated fresh from the document's
  `type: string` declaration. No run has ever recorded a status other than 404
  for this operation.
- Row 1, `addToCart`, is the only operation in the suite whose 2xx branch was
  reached last night.
- Ordering filed ORD-2210 on 2026-08-27: a pricing defect in checkout validation
  shipped to production while row 4 was reporting pass.

=============== FILE: docs/staging-auth.md ===============
# Staging auth, after the 2026-09-02 rotation

Bearer tokens are minted at `POST /v1/auth/token` with HTTP Basic credentials.

What changed on 2026-09-02:

| Property        | Before            | After             |
|-----------------|-------------------|-------------------|
| Token lifetime  | 24 hours          | 10 minutes        |
| Mint endpoint   | rate limited 30/min | rate limited 30/min |
| Refresh endpoint| did not exist     | `POST /v1/auth/refresh`, not rate limited |

The short lifetime is deliberate - staging shares an identity provider with
production and security would not sign off on long-lived tokens there any more.
`POST /v1/auth/refresh` takes the current token and returns a new one with a
fresh 10 minutes. It is not rate limited and it is the intended path for any
long-running client.

Staging is torn down and rebuilt from a seed dump every night at 01:00 UTC.
Nothing written to staging by a test survives the rebuild, and no team is asked
to clean up after itself there.

=============== FILE: openapi.yaml ===============
# Excerpt for review: rows 1-8 of the run report. The published document carries
# all 22 operations; the 14 not shown here declare no unauthorised response.
openapi: 3.0.3
info:
  title: Redgate Market Checkout API
  version: 4.8.1
paths:
  /v1/catalog:
    get:
      operationId: catalog
      responses:
        '200':
          description: catalogue page
          content:
            application/json:
              schema:
                type: object
                required: [items]
                properties:
                  items:
                    type: array
                    items: { $ref: '#/components/schemas/Item' }
  /v1/promotions:
    get:
      operationId: promotions
      responses:
        '200':
          description: active promotions
          content:
            application/json:
              schema:
                type: object
                properties:
                  codes: { type: array, items: { type: string } }
        '401':
          description: unauthorised
  /v1/shipping-options:
    get:
      operationId: shippingOptions
      responses:
        '200':
          description: options
          content:
            application/json:
              schema:
                type: object
                properties:
                  options: { type: array, items: { type: string } }
        '401':
          description: unauthorised
  /v1/carts:
    post:
      operationId: addToCart
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [sku, quantity]
              properties:
                sku: { type: string, minLength: 1, maxLength: 32 }
                quantity: { type: integer, minimum: 1, maximum: 99 }
      responses:
        '201':
          description: created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Cart' }
        '400':
          description: rejected
  /v1/carts/{id}:
    get:
      operationId: getCart
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: the cart
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Cart' }
        '404':
          description: no such cart
  /v1/checkout:
    post:
      operationId: checkout
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [cart_id, payment_method]
              properties:
                cart_id: { type: string }
                payment_method: { type: string, enum: [card, invoice] }
      responses:
        '201':
          description: checkout opened
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Checkout' }
        '402':
          description: payment declined
        '409':
          description: cart already checked out
  /v1/checkout/validate:
    post:
      operationId: validateCheckout
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [cart_id]
              properties:
                cart_id: { type: string }
      responses:
        '200':
          description: priced
          content:
            application/json:
              schema:
                type: object
                required: [total_cents]
                properties:
                  total_cents: { type: integer }
        '400':
          description: rejected
        '401':
          description: unauthorised
  /v1/checkout/confirm:
    post:
      operationId: confirmCheckout
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [checkout_id]
              properties:
                checkout_id: { type: string }
      responses:
        '200':
          description: order placed
          content:
            application/json:
              schema:
                type: object
                required: [order_id]
                properties:
                  order_id: { type: string }
        '409':
          description: already confirmed
components:
  schemas:
    Item:
      type: object
      required: [sku, price_cents]
      properties:
        sku: { type: string }
        price_cents: { type: integer }
    Cart:
      type: object
      required: [id, items]
      properties:
        id: { type: string }
        items:
          type: array
          items: { $ref: '#/components/schemas/Item' }
    Checkout:
      type: object
      required: [id, cart_id, total_cents]
      properties:
        id: { type: string }
        cart_id: { type: string }
        total_cents: { type: integer }

=============== FILE: test/document-lint.test.js ===============
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');

const spec = fs.readFileSync('openapi.yaml', 'utf8');

test('every operation declares an operationId', () => {
  const ops = spec.split('\n').filter((l) => /^ {6}operationId: /.test(l));
  assert.ok(ops.length >= 7, `only ${ops.length} operationIds found`);
});

test('every operation declares at least one 2xx response', () => {
  const blocks = spec.split(/^ {4}(?:get|post|put|patch|delete):$/m).slice(1);
  assert.ok(blocks.length >= 7, `only ${blocks.length} operation blocks found`);
  for (const b of blocks) {
    assert.match(b, /'2\d\d':/, b.split('\n')[1]);
  }
});
