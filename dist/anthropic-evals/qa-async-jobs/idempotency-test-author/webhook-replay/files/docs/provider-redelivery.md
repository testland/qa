# Northwind Pay - event delivery

Extract from the provider integration guide, retrieved 2026-08-04.

> Events are delivered **at least once**. An event is redelivered when the
> endpoint does not return 2xx within 10 seconds, and may also be redelivered
> after a 2xx response when a delivery batch is retried. Up to 5 attempts are
> made over 3 days.
>
> Every attempt carries the same `event_id`. Consumers MUST treat `event_id` as
> the unit of work and MUST NOT assume an event is delivered exactly once.

Redelivery is not a fault condition, is not reported on the provider status
page, and is not something a consumer can opt out of.
