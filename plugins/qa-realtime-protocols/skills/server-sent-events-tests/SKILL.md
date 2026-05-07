---
name: server-sent-events-tests
description: "Test Server-Sent Events (SSE) flows — `EventSource` API on the browser side (`onmessage`, `onerror`, `readyState` 0/1/2), event stream format (`data:`, `event:`, `id:`, `retry:`), `Last-Event-ID` reconnect-with-replay header, content-type `text/event-stream`, and HTTP/1.1 connection-pool limits. Use Playwright for browser-side, raw HTTP client for server-side stream tests."
type: skill
archetype: S1
rating: 22
d6: 4
keywords:
  - sse
  - server-sent-events
  - eventsource
  - one-way-streaming
  - realtime-protocols
---

# server-sent-events-tests

Per the [WHATWG SSE spec], `EventSource` enables servers to push
data to web pages over HTTP. Simpler than WebSocket: one-way
(server→client) only, but with native browser reconnect + replay.

## When to use

- Real-time UI updates that don't need bidirectional communication
  (notifications, log tailers, build status, score tickers).
- Mobile-friendly: better than long-polling for battery, simpler
  than WebSocket for proxies.
- Pre-deploy gate: SSE retry interval, replay via `Last-Event-ID`,
  and HTTP/1.1 connection limits all behave as designed.

## Step 1 — Server-side event stream format

Per the [WHATWG SSE spec], response must use
`Content-Type: text/event-stream` (UTF-8) and stream lines:

| Field | Meaning |
|---|---|
| `data:` | Appends to message payload (multiple `data:` lines join with newlines) |
| `event:` | Custom event type (default = `message`) |
| `id:` | Sets last event ID for reconnect replay |
| `retry:` | Reconnect interval (ms) |
| `:` | Comment line (kept-alive heartbeat) |

Empty line ends a message. Example:

```
event: order_update
id: 142
data: {"orderId":"o123","status":"shipped"}

event: order_update
id: 143
data: {"orderId":"o124","status":"shipped"}

```

## Step 2 — Browser test (Playwright)

```ts
import { test, expect } from '@playwright/test';

test('client receives server-pushed events', async ({ page }) => {
  await page.goto('https://localhost:3000/dashboard');

  const events = await page.evaluate(() => {
    return new Promise<any[]>((resolve) => {
      const collected: any[] = [];
      const es = new EventSource('/api/orders/stream');
      es.addEventListener('order_update', (e: any) => {
        collected.push(JSON.parse(e.data));
        if (collected.length === 2) {
          es.close();
          resolve(collected);
        }
      });
    });
  });

  expect(events).toHaveLength(2);
  expect(events[0].orderId).toBe('o123');
});
```

## Step 3 — `readyState` lifecycle

Per the [WHATWG SSE spec], `readyState` values:

| Value | State |
|---|---|
| 0 | CONNECTING |
| 1 | OPEN |
| 2 | CLOSED |

```ts
test('readyState transitions through CONNECTING → OPEN', async ({ page }) => {
  await page.goto('https://localhost:3000/dashboard');

  const transitions = await page.evaluate(() => {
    return new Promise<number[]>((resolve) => {
      const states: number[] = [];
      const es = new EventSource('/api/stream');
      states.push(es.readyState); // 0
      es.onopen = () => {
        states.push(es.readyState); // 1
        es.close();
        states.push(es.readyState); // 2
        resolve(states);
      };
    });
  });

  expect(transitions).toEqual([0, 1, 2]);
});
```

## Step 4 — Reconnect-with-replay via `Last-Event-ID`

Per the [WHATWG SSE spec], on disconnect the client automatically
reconnects with `Last-Event-ID: <last-id-seen>`. Server uses this
to replay missed events.

Server pseudocode:

```python
def stream(request):
    last_id = int(request.headers.get("Last-Event-ID", "0"))
    for evt in fetch_events_since(last_id):
        yield f"id: {evt.id}\nevent: {evt.type}\ndata: {evt.json()}\n\n"
```

Test (raw HTTP client, simulates reconnect):

```python
import requests

def test_replay_via_last_event_id():
    # First connection — read 5 events, then close
    with requests.get("http://localhost:8080/stream", stream=True) as r:
        events = parse_until_count(r, 5)
        last_id = events[-1]["id"]

    # Reconnect with Last-Event-ID
    headers = {"Last-Event-ID": last_id}
    with requests.get("http://localhost:8080/stream", stream=True, headers=headers) as r:
        replay = parse_until_count(r, 1)
        assert int(replay[0]["id"]) > int(last_id)
```

## Step 5 — Reconnect interval (`retry:`)

Server hints at reconnect interval:

```
retry: 10000
```

Browser will wait ≥ 10s before reconnecting. Test that browser honors:

```ts
test('client honors retry: 10000 on disconnect', async ({ page }) => {
  // Server emits retry: 10000, then closes
  const reconnectMs = await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      const es = new EventSource('/api/stream-with-retry');
      let openTime = 0;
      es.onopen = () => {
        if (openTime === 0) {
          openTime = performance.now();
        } else {
          es.close();
          resolve(performance.now() - openTime);
        }
      };
    });
  });
  // Allow ±20% slack
  expect(reconnectMs).toBeGreaterThanOrEqual(8000);
  expect(reconnectMs).toBeLessThanOrEqual(12000);
});
```

## Step 6 — Disable reconnect via `204 No Content`

Per the [WHATWG SSE spec], server responding `204 No Content`
disables further reconnection. Useful for "subscription ended"
scenarios:

```python
def stream(request):
    if user_unsubscribed(request):
        return Response(status=204)
    # ... event stream ...
```

Test the client gives up:

```ts
test('client stops reconnecting after server returns 204', async ({ page }) => {
  // Server returns 204 immediately
  const states = await page.evaluate(() => {
    return new Promise<number[]>((resolve) => {
      const es = new EventSource('/api/stream-204');
      const seen: number[] = [];
      const interval = setInterval(() => seen.push(es.readyState), 100);
      setTimeout(() => {
        clearInterval(interval);
        resolve(seen);
      }, 2000);
    });
  });
  expect(states[states.length - 1]).toBe(2); // CLOSED
});
```

## Step 7 — HTTP/1.1 connection-pool ceiling

Browsers cap concurrent HTTP/1.1 connections per origin (~6 in
Chrome). SSE consumes one persistently — apps with many
EventSource connections starve.

```ts
test('app uses single EventSource for fan-out', async ({ page }) => {
  await page.goto('https://localhost:3000/dashboard');

  const eventSourceCount = await page.evaluate(() =>
    performance.getEntriesByType('resource')
      .filter((r) => r.name.includes('/api/stream'))
      .length
  );
  expect(eventSourceCount).toBe(1);
});
```

HTTP/2 / HTTP/3 lift this limit but verify your CDN supports it
end-to-end.

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Wrong content-type | Browser doesn't recognize as SSE | `Content-Type: text/event-stream` (Step 1) |
| Skip newline-newline message terminator | Browser buffers indefinitely | Always end messages with `\n\n` (Step 1) |
| No `id:` on events | `Last-Event-ID` replay impossible | Always emit `id:` (Step 4) |
| Multiple `EventSource` per page on HTTP/1.1 | Connection pool starvation | One stream + multiplex via `event:` (Step 7) |
| Use SSE for two-way comms | One-way only; need WebSocket for client→server | Use `websocket-tests` skill instead |

## Limitations

- SSE is HTTP-only; some intermediaries (legacy proxies) buffer
  responses, breaking real-time push.
- No native binary support; SSE is text-only (use WebSocket if
  binary needed).
- Reconnect uses `Last-Event-ID` only — server must persist event
  IDs (or generate from timestamp) for replay to work.

## References

- [WHATWG SSE spec] — EventSource API, stream format, replay, retry
- [`websocket-tests`](../websocket-tests/SKILL.md) — bidirectional
  alternative
- [`grpc-streaming-tests`](../grpc-streaming-tests/SKILL.md) — typed
  RPC streaming alternative

[WHATWG SSE spec]: https://html.spec.whatwg.org/multipage/server-sent-events.html
