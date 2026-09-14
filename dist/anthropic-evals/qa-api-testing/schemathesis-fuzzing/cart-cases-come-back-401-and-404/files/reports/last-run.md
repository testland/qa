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
