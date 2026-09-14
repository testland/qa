# Every cart and order case comes back 401 or cart-not-found, and the PM wants the generator to walk checkout

## Problem Description

Orillo Commerce. Our generated API suite builds its cases from the spec and
covers 31 operations against staging. Nineteen of them are fine. The twelve
under `/v1/carts` and `/v1/orders` have never produced a useful result: they
come back 401, or 404 cart not found, because a cart id generated out of thin
air does not exist.

Tomas spent last week on it. He has the suite handing the cart id from one
generated case down to the next through a couple of module-level variables, and
the board went green on Thursday. The ordering team looked at it on Friday and
said checkout still is not tested, which went down badly, and now nobody can
agree on what actually happened.

Our PM wrote this in the planning doc this morning:

> The ask is simple. Make the generator walk login, create cart, add item,
> place order, fetch order, in that order, so we get real coverage of checkout
> from the thing we already pay for. I do not want to sign off another quarter
> of hand-written flow tests that go stale every time the cart service changes.

I have attached Thursday's run report, the suite, and the staging auth notes.
Tell me what we do. If part of that ask is not something this suite is going to
give us, say so plainly and say what will, because the PM is going to want a
straight answer on where checkout coverage comes from.

## Output Specification

1. Fixed `tests/api/conftest.py` and `tests/api/test_generated.py`.
2. `docs/checkout-coverage.md` - what covers the ordered checkout flow, what
   covers the individual operations, and what the PM gets from each. Written for
   the PM, not for us.

Do not edit `openapi.yaml` - the cart service publishes it. Do not remove any
operation from the suite's scope.

## Input Files

Extract the following files before beginning.

=============== FILE: tests/api/conftest.py ===============
import os

import pytest
import requests

BASE = os.environ["STAGING_BASE"]

# handed from one generated case to the next - set in test_generated.py
CART_ID = None
ORDER_ID = None


@pytest.fixture(scope="session", autouse=True)
def login():
    r = requests.post(
        f"{BASE}/v1/sessions",
        json={"email": "qa@orillo.test", "password": os.environ["QA_PASSWORD"]},
    )
    r.raise_for_status()
    os.environ["ORILLO_TOKEN"] = r.json()["access_token"]
    return os.environ["ORILLO_TOKEN"]

=============== FILE: tests/api/test_generated.py ===============
import json
import os

import schemathesis
from hypothesis import settings

import conftest

schema = schemathesis.openapi.from_url(os.environ["SCHEMA_URL"])

COUNTS = {"generated": 0, "validated": 0}


@schema.parametrize()
@settings(max_examples=3)  # each example writes a real cart row - keep it low
def test_api(case):
    COUNTS["generated"] += 1

    if "{cart_id}" in case.path and conftest.CART_ID is None:
        return
    if "{order_id}" in case.path and conftest.ORDER_ID is None:
        return

    params = dict(case.path_parameters or {})
    if "cart_id" in params:
        params["cart_id"] = conftest.CART_ID
    if "order_id" in params:
        params["order_id"] = conftest.ORDER_ID
    case.path_parameters = params

    response = case.call(
        headers={"Authorization": f"Bearer {os.environ.get('ORILLO_TOKEN', '')}"}
    )

    if case.method.upper() == "POST" and case.path == "/v1/carts" and response.status_code == 201:
        conftest.CART_ID = response.json()["id"]
    if case.method.upper() == "POST" and case.path == "/v1/orders" and response.status_code == 201:
        conftest.ORDER_ID = response.json()["id"]

    COUNTS["validated"] += 1
    case.validate_response(response)


def test_checkout_operations_are_published():
    paths = schema.raw_schema["paths"]
    for p in ["/v1/sessions", "/v1/carts", "/v1/carts/{cart_id}/items", "/v1/orders"]:
        assert p in paths


def teardown_module(module):
    os.makedirs("logs", exist_ok=True)
    with open("logs/counts.json", "w") as fh:
        json.dump(COUNTS, fh)

=============== FILE: reports/last-run.md ===============
# Run 2026-09-11, staging, 31 operations - reported GREEN

Wall clock 26 minutes. `logs/counts.json` after the run:

    {"generated": 930, "validated": 62}

Per-operation outcome:

| Operation                             | generated | validated | outcome |
|---------------------------------------|-----------|-----------|---------|
| GET /v1/products                      | 3         | 3         | pass    |
| GET /v1/products/{sku}                | 3         | 3         | pass    |
| ... 17 further non-checkout operations| 51        | 51        | pass    |
| POST /v1/sessions                     | 3         | 3         | pass    |
| POST /v1/carts                        | 3         | 2         | pass    |
| GET /v1/carts/{cart_id}               | 3         | 0         | pass    |
| PATCH /v1/carts/{cart_id}             | 3         | 0         | pass    |
| DELETE /v1/carts/{cart_id}            | 3         | 0         | pass    |
| POST /v1/carts/{cart_id}/items        | 3         | 0         | pass    |
| DELETE /v1/carts/{cart_id}/items/{id} | 3         | 0         | pass    |
| POST /v1/orders                       | 3         | 0         | pass    |
| GET /v1/orders/{order_id}             | 3         | 0         | pass    |
| PATCH /v1/orders/{order_id}           | 3         | 0         | pass    |
| POST /v1/orders/{order_id}/cancel     | 3         | 0         | pass    |
| GET /v1/orders                        | 3         | 1         | pass    |
| POST /v1/refunds                      | 3         | 0         | pass    |

Notes from the runner log:

- 21 of the 930 generated cases produced a request. The remainder returned
  before a request was sent.
- Of the 21 requests, 14 came back 401. The first 401 appears 5 minutes 40
  seconds into the run and every request after that point is a 401.
- The two `POST /v1/carts` cases that did issue a request returned 201 and 422.
- Before Tomas's change the same twelve operations reported failures on every
  case. After it they report pass.

=============== FILE: docs/staging-auth.md ===============
# Staging auth and data notes

- `POST /v1/sessions` returns an access token. **Token lifetime is 5 minutes**
  on staging (15 in production). `POST /v1/sessions/refresh` takes the refresh
  token and returns a new access token; the refresh token lasts 12 hours.
- The login endpoint is rate limited to 30 requests per minute per source IP.
  Exceeding it returns 429 for the next minute. This limit is on `/v1/sessions`
  only; refresh is not limited.
- The staging database is dropped and recreated from migrations every night at
  02:00 UTC. It holds no real customer data and nothing in it is retained.
  Writing rows to staging costs nothing and QA is not asked to clean up.
- Do not commit a long-lived token to the repository. The security team revokes
  any token that appears in a commit and files it as an incident.

=============== FILE: openapi.yaml ===============
openapi: 3.0.3
info:
  title: Orillo Commerce API
  version: 4.1.0
paths:
  /v1/sessions:
    post:
      operationId: login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email: { type: string, format: email }
                password: { type: string, minLength: 8 }
      responses:
        '200':
          description: token
          content:
            application/json:
              schema:
                type: object
                required: [access_token, refresh_token]
                properties:
                  access_token: { type: string }
                  refresh_token: { type: string }
        '401': { description: rejected }
  /v1/carts:
    post:
      operationId: createCart
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [currency]
              properties:
                currency: { type: string, minLength: 3, maxLength: 3 }
      responses:
        '201':
          description: created
          content:
            application/json:
              schema:
                type: object
                required: [id, currency, items]
                properties:
                  id: { type: string }
                  currency: { type: string }
                  items: { type: array, items: { type: object } }
        '422': { description: rejected }
  /v1/carts/{cart_id}:
    get:
      operationId: getCart
      parameters:
        - name: cart_id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: cart
          content:
            application/json:
              schema:
                type: object
                required: [id, currency, items]
                properties:
                  id: { type: string }
                  currency: { type: string }
                  items: { type: array, items: { type: object } }
        '404': { description: unknown cart }
  /v1/carts/{cart_id}/items:
    post:
      operationId: addItem
      parameters:
        - name: cart_id
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [sku, quantity]
              properties:
                sku: { type: string }
                quantity: { type: integer, minimum: 1, maximum: 99 }
      responses:
        '201': { description: added }
        '404': { description: unknown cart }
        '422': { description: rejected }
  /v1/orders:
    post:
      operationId: placeOrder
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
        '201':
          description: placed
          content:
            application/json:
              schema:
                type: object
                required: [id, status, total_cents]
                properties:
                  id: { type: string }
                  status: { type: string, enum: [placed, paid, cancelled] }
                  total_cents: { type: integer }
        '404': { description: unknown cart }
        '422': { description: rejected }
  /v1/orders/{order_id}:
    get:
      operationId: getOrder
      parameters:
        - name: order_id
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: order
          content:
            application/json:
              schema:
                type: object
                required: [id, status, total_cents]
                properties:
                  id: { type: string }
                  status: { type: string, enum: [placed, paid, cancelled] }
                  total_cents: { type: integer }
        '404': { description: unknown order }
