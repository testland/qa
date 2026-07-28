# WebSocket test recipes

Close-frame status codes and backpressure / large-message recipes.
All codes and frame limits are per [RFC 6455](https://datatracker.ietf.org/doc/html/rfc6455).

## Close-frame status code matrix

Standard close codes:

| Code | Meaning |
|---|---|
| 1000 | Normal closure |
| 1001 | Endpoint going away |
| 1002 | Protocol error |
| 1006 | Abnormal closure (no close frame received) |
| 1011 | Server error |

Test the matrix per scenario:

```js
test('server sends 1011 on internal error', async () => {
  const ws = new WebSocket('ws://localhost:8080/');
  await new Promise((r) => ws.once('open', r));

  ws.send(JSON.stringify({ trigger: 'crash' }));
  const code = await new Promise((r) => ws.once('close', (c) => r(c)));
  expect(code).toBe(1011);
});

test('graceful shutdown sends 1001', async () => {
  // server initiates shutdown; client observes 1001
  const ws = new WebSocket('ws://localhost:8080/');
  await new Promise((r) => ws.once('open', r));

  await fetch('http://localhost:8080/admin/shutdown', { method: 'POST' });
  const code = await new Promise((r) => ws.once('close', (c) => r(c)));
  expect(code).toBe(1001);
});
```

Verify: assert the observed close code equals the code the scenario
should trigger; if it is 1006 (abnormal) instead, the server dropped
the socket without a close frame - fix the server shutdown path
before trusting the code matrix.

## Backpressure / large message tests

Control frame payloads are <= 125 bytes; data frames have no upper
bound but implementations apply limits. Test the server's
`maxPayload` config:

```js
test('server rejects message > maxPayload', async () => {
  const ws = new WebSocket('ws://localhost:8080/');
  await new Promise((r) => ws.once('open', r));

  const big = 'a'.repeat(2 * 1024 * 1024); // 2 MB
  ws.send(big);

  const code = await new Promise((r) => ws.once('close', (c) => r(c)));
  expect(code).toBe(1009); // Message too big
});
```
