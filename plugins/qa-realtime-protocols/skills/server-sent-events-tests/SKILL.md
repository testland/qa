---
name: server-sent-events-tests
description: "Test Server-Sent Events (SSE) flows, one-way server-to-client push only (not bidirectional, use websocket-tests for client-to-server messaging): `EventSource` API on the browser side (`onmessage`, `onerror`, `readyState` 0/1/2), event stream format (`data:`, `event:`, `id:`, `retry:`), `Last-Event-ID` reconnect-with-replay header, content-type `text/event-stream`, and HTTP/1.1 connection-pool limits. Use Playwright for browser-side, raw HTTP client for server-side stream tests; k6 load testing (concurrent-stream capacity, connection churn, HTTP/1.1 vs HTTP/2 ceiling) lives in references/sse-load.md. Use when a feature pushes updates over `text/event-stream` and the reconnect interval, `Last-Event-ID` replay, per-origin connection ceiling, or concurrent-stream capacity has no coverage."
metadata:
  keywords: "sse, server-sent-events, eventsource, one-way-streaming, realtime-protocols"
---

# server-sent-events-tests

Tests the SSE surfaces per the [WHATWG SSE spec]: stream format,
`readyState` lifecycle, `Last-Event-ID` reconnect-with-replay, and
the HTTP/1.1 connection-pool ceiling.

## When to use

- Real-time UI updates that don't need bidirectional communication
  (notifications, log tailers, build status, score tickers).
- Pre-deploy gate: SSE retry interval, replay via `Last-Event-ID`,
  and HTTP/1.1 connection limits all behave as designed.

## Step 1 - Server-side event stream format

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

## Step 2 - Browser test (Playwright)

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

## Step 3 - `readyState` lifecycle

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

## Deeper recipes

Reconnect-with-replay via `Last-Event-ID`, the `retry:` interval,
`204 No Content` disable, and the HTTP/1.1 connection-pool ceiling
are in [references/sse-test-recipes.md](references/sse-test-recipes.md).

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Wrong content-type | Browser doesn't recognize as SSE | `Content-Type: text/event-stream` (Step 1) |
| Skip newline-newline message terminator | Browser buffers indefinitely | Always end messages with `\n\n` (Step 1) |
| No `id:` on events | `Last-Event-ID` replay impossible | Always emit `id:` (see references) |
| Multiple `EventSource` per page on HTTP/1.1 | Connection pool starvation | One stream + multiplex via `event:` (see references) |
| Use SSE for two-way comms | One-way only; need WebSocket for client→server | Use `websocket-tests` skill instead |

## Limitations

- SSE is HTTP-only; some intermediaries (legacy proxies) buffer
  responses, breaking real-time push.
- No native binary support; SSE is text-only (use WebSocket if
  binary needed).
- Reconnect uses `Last-Event-ID` only - server must persist event
  IDs (or generate from timestamp) for replay to work.

## References

- [WHATWG SSE spec] - EventSource API, stream format, replay, retry
- SSE load testing (k6 concurrent-stream capacity, churn, HTTP/1.1 vs
  HTTP/2): [references/sse-load.md](references/sse-load.md)
- `websocket-tests` - bidirectional
  alternative
- `grpc-streaming-test-author` (qa-grpc) - typed
  RPC streaming alternative

[WHATWG SSE spec]: https://html.spec.whatwg.org/multipage/server-sent-events.html
