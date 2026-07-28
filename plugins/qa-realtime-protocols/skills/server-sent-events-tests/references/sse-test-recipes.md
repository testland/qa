# SSE test recipes

Deeper recipes for reconnect-with-replay, retry interval, `204`
disable, and the HTTP/1.1 connection-pool ceiling. All behavior is
per the [WHATWG SSE spec](https://html.spec.whatwg.org/multipage/server-sent-events.html).

## Reconnect-with-replay via `Last-Event-ID`

On disconnect the client automatically reconnects with
`Last-Event-ID: <last-id-seen>`. The server uses it to replay missed
events.

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

# parse_until_count(r, n): read the stream until n complete events parse, return them
def test_replay_via_last_event_id():
    # First connection - read 5 events, then close
    with requests.get("http://localhost:8080/stream", stream=True) as r:
        events = parse_until_count(r, 5)
        last_id = events[-1]["id"]

    # Reconnect with Last-Event-ID
    headers = {"Last-Event-ID": last_id}
    with requests.get("http://localhost:8080/stream", stream=True, headers=headers) as r:
        replay = parse_until_count(r, 1)
        assert int(replay[0]["id"]) > int(last_id)
```

Verify: assert the reconnect request carries `Last-Event-ID` and the
first replayed `id` is greater than the last one seen; if it is not,
the server is not persisting event IDs - fix the store before relying
on replay.

## Reconnect interval (`retry:`)

Server hints at the reconnect interval:

```
retry: 10000
```

The browser waits >= 10s before reconnecting. Test that it honors the hint:

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
  // Allow +/-20% slack
  expect(reconnectMs).toBeGreaterThanOrEqual(8000);
  expect(reconnectMs).toBeLessThanOrEqual(12000);
});
```

## Disable reconnect via `204 No Content`

A server responding `204 No Content` disables further reconnection.
Useful for "subscription ended" scenarios:

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

## HTTP/1.1 connection-pool ceiling

Browsers cap concurrent HTTP/1.1 connections per origin (~6 in
Chrome). SSE consumes one persistently - apps with many EventSource
connections starve.

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
