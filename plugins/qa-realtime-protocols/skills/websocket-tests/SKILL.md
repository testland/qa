---
name: websocket-tests
description: "Test WebSocket protocol behavior - opening handshake (HTTP Upgrade with Sec-WebSocket-Key + Sec-WebSocket-Version: 13), control frames (ping 0x9 / pong 0xA / close 0x8), close-frame status codes (1000 normal, 1001 going-away, 1006 abnormal, 1011 server error), subprotocol negotiation, backpressure, and reconnect with jitter. Works with ws (Node), websockets (Python), or Playwright frame inspection per language. Use when a feature holds a long-lived WebSocket open and reconnect, close-code, or backpressure behavior is unverified."
metadata:
  keywords: "websocket, rfc6455, realtime-protocols, frame-testing, reconnection"
---

# websocket-tests

Per [RFC 6455], tests must cover the **handshake**, **control
frames**, **close codes**, and **subprotocol negotiation** - not
just message round-trips.

## When to use

- Testing a real-time service: chat, notifications, collaborative
  editing, live dashboards.
- Validating reconnection logic after server-side restart or
  network partition.
- Pre-deployment gate: the close-code matrix is correct + ping/pong
  keepalive is wired.

## Step 1 - Pick the client lib

| Stack | Library |
|---|---|
| Node | `ws` (npm install ws) |
| Browser e2e | Playwright `page.on('websocket', …)` for frame inspection |
| Python | `websockets` |
| Go | `github.com/gorilla/websocket` |
| Java | `io.javalin/javalin-testtools` or `org.glassfish.tyrus/tyrus-client` |

## Step 2 - Handshake assertions

Per [RFC 6455], the opening handshake requires:

- HTTP GET, version 1.1+
- `Upgrade: websocket`
- `Connection: Upgrade`
- `Sec-WebSocket-Key`: base64 16-byte nonce
- `Sec-WebSocket-Version: 13`

Test that an upgrade is performed (101) and that the accept header
matches:

```js
import { WebSocket } from 'ws';
import crypto from 'crypto';

test('handshake completes with correct accept header', async () => {
  const ws = new WebSocket('ws://localhost:8080/');
  await new Promise((res, rej) => {
    ws.once('upgrade', (msg) => {
      expect(msg.statusCode).toBe(101);
      // server derives accept: base64(sha1(key + RFC 6455 GUID))
      const expectedKey = crypto
        .createHash('sha1')
        .update(ws._req?.getHeader('Sec-WebSocket-Key') + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
        .digest('base64');
      expect(msg.headers['sec-websocket-accept']).toBe(expectedKey);
      res(null);
    });
    ws.once('error', rej);
  });
  ws.close();
});
```

## Step 3 - Subprotocol negotiation

The `Sec-WebSocket-Protocol` header negotiates a subprotocol; the
server selects one or none.

```js
test('server picks v2 subprotocol when offered', async () => {
  const ws = new WebSocket('ws://localhost:8080/', ['chat-v1', 'chat-v2']);
  await new Promise((r) => ws.once('open', r));
  expect(ws.protocol).toBe('chat-v2');
  ws.close();
});

test('server rejects unknown subprotocol', async () => {
  const ws = new WebSocket('ws://localhost:8080/', ['unknown-v99']);
  await new Promise((res) => ws.once('close', (code) => { expect(code).toBe(1002); res(null); }));
});
```

## Step 4 - Ping/pong keepalive

Control frames include `ping (0x9)`, `pong (0xA)`, `close (0x8)`;
payloads <= 125 bytes.

```js
test('client receives pong within 5s of ping', async () => {
  const ws = new WebSocket('ws://localhost:8080/');
  await new Promise((r) => ws.once('open', r));

  const pongReceived = new Promise((resolve) => {
    ws.on('pong', () => resolve(true));
  });
  ws.ping('keepalive');

  const got = await Promise.race([
    pongReceived,
    new Promise((r) => setTimeout(() => r(false), 5000)),
  ]);
  expect(got).toBe(true);
  ws.close();
});
```

## Deeper recipes

The close-frame status-code matrix (1000/1001/1002/1006/1011) and
the backpressure / large-message (`maxPayload`, 1009) recipes are in
[references/websocket-test-recipes.md](references/websocket-test-recipes.md).

## Step 5 - Reconnect with jitter

Reconnect logic should exponential backoff + jitter (not RFC 6455
itself, but field-tested practice):

```js
test('client reconnects within 30s after server bounce', async () => {
  const ws = createReconnectingClient('ws://localhost:8080/');
  await waitForState(ws, 'open');

  await bounceServer();

  const reconnected = await waitForState(ws, 'open', { timeout: 30_000 });
  expect(reconnected).toBe(true);
});
```

Cross-ref `error-budget-tests` for SLO-driven
reconnect budget.

## Step 6 - Playwright frame inspection (browser e2e)

```ts
test('app sends auth frame on open', async ({ page }) => {
  page.on('websocket', (ws) => {
    ws.on('framesent', (event) => {
      const data = JSON.parse(event.payload as string);
      if (data.type === 'auth') {
        expect(data.token).toBeTruthy();
      }
    });
  });
  await page.goto('https://localhost:3000/dashboard');
});
```

## Anti-patterns

| Anti-pattern | Why it fails | Fix |
|---|---|---|
| Skip handshake test (assume browser handles it) | Server-side `Sec-WebSocket-Accept` bug ships | Step 2 |
| Test only happy-path message exchange | Reconnect/close-code bugs slip through | Step 5 + close-code recipe (references) |
| Use HTTP polling fallback as "good enough" | Different code path; doesn't validate WS | Test the actual WS path |
| Hard-code reconnect interval, no jitter | Thundering herd on server bounce | Exponential backoff + jitter |
| Skip subprotocol test in versioned APIs | Old clients silently get v2 server response shape | Step 3 |

## Limitations

- RFC 6455 is the base spec. WebSocket-over-HTTP/2 (RFC 8441)
  changes the bootstrap; verify per stack if HTTP/2 is in play.
- Browser autobahn-suite-style edge cases (fragmentation, extension
  negotiation) are out of scope here; use Autobahn TestSuite for
  full conformance.

## References

- [RFC 6455] - WebSocket protocol (handshake, frames, close codes)
- `server-sent-events-tests` - 
  one-way push alternative
- `grpc-streaming-test-author` (qa-grpc) - typed
  RPC streaming alternative

[RFC 6455]: https://datatracker.ietf.org/doc/html/rfc6455
