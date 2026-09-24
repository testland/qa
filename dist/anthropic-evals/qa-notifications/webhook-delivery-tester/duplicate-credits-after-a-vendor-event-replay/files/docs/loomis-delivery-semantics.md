# Loomis Commerce — delivery semantics (extract, integration guide v9)

- Every delivery carries a `webhook-id` that is **stable across retries of that
  delivery** and unique per delivery otherwise.
- Events carry their own `id`. A single event may be delivered more than once.
- `data.id` is the identifier of the object the event concerns. Several events
  in a stream will share a `data.id`.
- Ordering is not guaranteed. Concurrent retries and platform recovery can
  deliver events for the same object out of order. Objects that change over time
  carry a monotonically increasing `data.version`.
- **Any non-2xx response is retried** on a backoff schedule for up to 24 hours,
  after which the delivery is marked failed and can be re-sent from the
  dashboard for 30 days.
