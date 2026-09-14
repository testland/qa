# Services touched by one checkout

| Name | Repo | Runtime | Owner |
|---|---|---|---|
| checkout-svc | this repo | node, api pods | checkout |
| inventory-svc | `stockroom/inventory-svc` | go, its own deployment | stockroom |
| fulfilment-worker | `stockroom/fulfilment-worker` | go, consumes `fulfilment.requested` off rabbitmq in a separate process pool | stockroom |

Notes:

- checkout-svc talks to inventory-svc over HTTP and reaches fulfilment-worker
  only by publishing to rabbitmq. Neither is importable from here: no shared
  library, no test double published by stockroom, and no in-process mode.
- Staging runs all three against one traces backend (`tempo-staging`). The
  nightly end-to-end suite in `stockroom/e2e` already drives a real checkout
  through real instances of all three and has a trace id to hand afterwards.
- stockroom own the instrumentation in their two services. We have never had a
  say in what they name a span.
