# NorthPay - request retry behaviour

Extract from the provider integration guide, retrieved 2026-08-02.

> When NorthPay does not receive a 2xx within the 30 second request timeout, the
> charge request is retried on the following schedule, carrying the **same**
> `Idempotency-Key` header supplied on the original attempt:
>
> | attempt | delay after original |
> |---|---|
> | 2 | 1 minute |
> | 3 | 8 minutes |
> | 4 | 45 minutes |
> | 5 | 3 hours |
> | 6 | 6 hours |
>
> After attempt 6 the charge is marked `undeliverable` and surfaced in the
> dashboard for manual action. Merchants MUST treat a key as live until the
> retry schedule is exhausted.
