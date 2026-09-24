# Services touched by one checkout

| Name | Repo | Runtime | Owner |
|---|---|---|---|
| checkout-svc | this repo | node, api pods | checkout |
| inventory-svc | `stockroom/inventory-svc` | go, its own deployment | stockroom |
| fulfilment-worker | `stockroom/fulfilment-worker` | go, consumes `fulfilment.requested` off rabbitmq in a separate process pool | stockroom |

Notes:

- checkout-svc talks to inventory-svc over HTTP and reaches fulfilment-worker
  only by publishing to rabbitmq. Neither is importable from here: no shared
  library, no test double published by stockroom, no in-process mode, and
  neither binary runs in this repo's CI image.
- Staging is the one environment where all three run at the same time against a
  single traces backend (`tempo-staging`). stockroom own what runs against it.
- stockroom own the instrumentation in their two services. We have never had a
  say in what they name a span, and they have renamed spans on us twice.
