---
name: websocket-tests
description: "Use whenever the task is to test a WebSocket endpoint or real-time server: connect, send and receive messages, ping/pong, close codes, reconnect after the server drops, subprotocols and backpressure, with ws, Python websockets or Playwright."
metadata:
  keywords: "websocket, rfc6455, realtime-protocols, frame-testing, reconnection"
  version: "1.3.10"
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

test('client gives up when the server picks none of its subprotocols', async () => {
  const ws = new WebSocket('ws://localhost:8080/', ['unknown-v99']);
  const err = new Promise((r) => ws.once('error', r));
  const code = new Promise((r) => ws.once('close', (c) => r(c)));
  expect((await err).message).toBe('Server sent no subprotocol');
  expect(await code).toBe(1006);
});
```

No close frame is involved here: when a `ws` server's `handleProtocols`
returns `false` the upgrade succeeds without a `Sec-WebSocket-Protocol`
header, and the `ws` client aborts the handshake itself with the error
above, so the close code is the local 1006, not 1002 ([ws-src]).

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

## Step 5 - Reconnect: backoff, when to stop, browser close rules

Backoff is in the protocol itself. [RFC 6455] section 7.2.3: "clients
SHOULD use some form of backoff when trying to reconnect after abnormal
closures", "The first reconnect attempt SHOULD be delayed by a random
amount of time", and later attempts "SHOULD be delayed by increasingly
longer amounts of time". A fixed delay makes every client that lost the
same server come back in the same second (a reconnect storm). Use a
random first delay, then capped exponential delays with jitter, and
reset the attempt counter once a connection has stayed up.

Not every close should be retried. Decide by close code:

| Close code | Meaning | Client action |
|---|---|---|
| Own `close(1000)` (logout, unmount) | Deliberate | Stop. Set a `stopped` flag before closing. |
| 1006 | Connection dropped without a close frame (reported locally) | Reconnect with backoff. |
| 1001, 1011, 1012-1014 | Server going away or failing | Reconnect with backoff. |
| 1008 | Policy violation | Stop; fix the cause or re-authenticate. |
| 1009 | Message too big | Don't resend the same message. |
| 4000-4999 chosen by the app for auth or session revoked | Application decision | Stop and re-authenticate; retrying loops forever. |

RFC 6455 section 7.4.2 reserves 3000-3999 "for use by libraries,
frameworks, and applications" and 4000-4999 "for private use", so
app-specific codes belong in 4000-4999.

**Browser `close()` is stricter than Node `ws`.** Per the [WHATWG
WebSockets standard][whatwg], `WebSocket.close(code, reason)` throws an
`InvalidAccessError` `DOMException` unless code is 1000 or in 3000-4999,
and a `SyntaxError` when the reason is longer than 123 bytes as UTF-8.
So `close(1001)` from page script throws. The Node `ws` client accepts
1000-1014 except 1004-1006, plus 3000-4999 ([ws-src]), so a test that
runs the client against `ws` or a permissive fake passes while the
browser throws. Make the fake enforce the browser rules.

**1006 is never on the wire.** RFC 6455: "1006 is a reserved value and
MUST NOT be set as a status code in a Close control frame by an
endpoint". A client sees 1006 when the TCP connection dies. To produce
it from a test server, call `socket.terminate()` (it destroys the
socket, per the [ws API][ws-api]) instead of `close(1006)`, which `ws`
rejects.

```js
// client: random, capped, exponential delays; no retry after a deliberate or auth close
export function connect(url, onEvent, { random = Math.random, base = 1000, cap = 30_000 } = {}) {
  const NO_RETRY = new Set([1008, 4000]);          // 4000: this app's "session revoked"
  let ws, attempt = 0, stopped = false, timer;
  function open() {
    ws = new WebSocket(url);
    ws.onmessage = (e) => { attempt = 0; onEvent(JSON.parse(e.data)); };  // healthy again
    ws.onclose = (e) => {
      if (stopped || NO_RETRY.has(e.code)) return;
      timer = setTimeout(open, random() * Math.min(cap, base * 2 ** attempt++));
    };
  }
  open();
  return { stop() { stopped = true; clearTimeout(timer); ws.close(1000, 'bye'); } };
}
```

```js
// test: a fake that behaves like the browser, fake timers, a fixed random source
class BrowserLikeSocket {
  static all = [];
  constructor(url) { this.url = url; BrowserLikeSocket.all.push(this); }
  close(code, reason = '') {
    if (code !== undefined && code !== 1000 && (code < 3000 || code > 4999))
      throw new DOMException('bad close code', 'InvalidAccessError');
    if (new TextEncoder().encode(reason).length > 123)
      throw new DOMException('reason too long', 'SyntaxError');
    this.onclose?.({ code: code ?? 1005 });
  }
}
globalThis.WebSocket = BrowserLikeSocket;

beforeEach(() => { BrowserLikeSocket.all = []; jest.useFakeTimers(); });

test('backs off with jitter after an abnormal close', () => {
  connect('wss://example.test/live', () => {}, { random: () => 0.5 });
  BrowserLikeSocket.all[0].onclose({ code: 1006 });
  jest.advanceTimersByTime(499);
  expect(BrowserLikeSocket.all).toHaveLength(1);
  jest.advanceTimersByTime(1);                       // 0.5 * 1000 ms
  expect(BrowserLikeSocket.all).toHaveLength(2);
  BrowserLikeSocket.all[1].onclose({ code: 1006 });
  jest.advanceTimersByTime(999);
  expect(BrowserLikeSocket.all).toHaveLength(2);     // next delay is 0.5 * 2000 ms
});

test('does not reconnect after an auth close or stop()', () => {
  const c = connect('wss://example.test/live', () => {}, { random: () => 0.5 });
  BrowserLikeSocket.all[0].onclose({ code: 4000 });
  jest.advanceTimersByTime(60_000);
  expect(BrowserLikeSocket.all).toHaveLength(1);
  expect(() => c.stop()).not.toThrow();              // a 1001 here would throw like the browser
});
```

For the end-to-end version, bounce a real server (or `terminate()` every
server-side socket) and assert the client is back within the backoff
cap. Cross-ref `error-budget-tests` for an SLO-driven reconnect budget.

## Step 6 - Server limits and test teardown (Node `ws`)

Per the [ws API][ws-api] and [ws README][ws-readme]:

- **`maxPayload`** is "The maximum allowed message size in bytes",
  default 104857600 (100 MiB), and "Set to 0 to disable the limit". Set
  it to the product limit. `ws` counts the *decompressed* size against
  it, so a small permessage-deflate frame that inflates past the limit
  is also rejected ([ws-src]); the connection closes with 1009.
- **Handle `'error'` on every server-side socket.** An oversized or
  malformed message is emitted as an `'error'` event on that socket
  before the close; with no listener, Node throws and the whole server
  process goes down. `ws.on('error', log)` in the `connection` handler.
- **permessage-deflate** "is disabled by default on the server and
  enabled by default on the client", "adds a significant overhead in
  terms of performance and memory consumption", and Node's zlib can show
  "catastrophic memory fragmentation" under concurrency. Leave it off
  unless bandwidth needs it; if on, keep `maxPayload` finite and tune
  `threshold` (default 1024 bytes) and `concurrencyLimit` (default 10).
- **`wss.close()` does not end the test run by itself.** "Existing
  connections are not closed automatically", and with the `server` or
  `noServer` option the HTTP server "must be closed manually". Teardown:
  `for (const c of wss.clients) c.terminate()`, then `wss.close()`, then
  `server.close()`. A graceful `close()` to a peer that never answers
  waits `closeTimeout` (default 30000 ms) before the socket is forced
  shut.

```js
import http from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';

async function roundTrip(url, payload) {
  const ws = new WebSocket(url);
  await new Promise((r) => ws.once('open', r));
  const reply = new Promise((r) => ws.once('message', r));
  ws.send(payload);
  const got = await reply;
  ws.close();
  return got;
}

let srv, wss, url;
beforeAll(async () => {
  srv = http.createServer();
  wss = new WebSocketServer({ server: srv, maxPayload: 64 * 1024 });
  wss.on('connection', (ws) => { ws.on('error', () => {}); ws.on('message', (m) => ws.send(m)); });
  await new Promise((r) => srv.listen(0, r));          // port 0: no clashes between workers
  url = `ws://127.0.0.1:${srv.address().port}`;
});
afterAll(async () => {
  for (const c of wss.clients) c.terminate();
  await new Promise((r) => wss.close(r));
  await new Promise((r) => srv.close(r));
});

test('a message at the limit is delivered, one byte more closes with 1009', async () => {
  const ok = await roundTrip(url, Buffer.alloc(64 * 1024));            // echoed back
  expect(ok.length).toBe(64 * 1024);
  const ws = new WebSocket(url);
  await new Promise((r) => ws.once('open', r));
  ws.send(Buffer.alloc(64 * 1024 + 1));
  expect(await new Promise((r) => ws.once('close', r))).toBe(1009);
});
```

If the server enables compression, add the inflation case: a client
created with `perMessageDeflate: true` sends a large run of zeros that
is a few KB on the wire, and the test expects 1009 and no delivery.

## Step 7 - Playwright frame inspection (browser e2e)

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
| Hard-code reconnect interval, no jitter | Thundering herd on server bounce | Random first delay, capped exponential backoff (Step 5) |
| Reconnect on every close code | Revoked or banned sessions retry forever | Stop on deliberate, policy and app auth closes (Step 5) |
| Fake `WebSocket` that accepts any `close()` code | Browser-only `InvalidAccessError` ships | Fake enforces 1000 / 3000-4999 and 123 bytes (Step 5) |
| Server test "sends 1006" | 1006 never travels in a close frame | `terminate()` the socket (Step 5) |
| `maxPayload: 0`, or the 100 MiB default left on a public server | One message can exhaust memory | Product limit, `'error'` handler per socket (Step 6) |
| Teardown awaits `wss.close()` with clients still open | Jest never exits | Terminate clients, then close `wss` and the HTTP server (Step 6) |
| Skip subprotocol test in versioned APIs | Old clients silently get v2 server response shape | Step 3 |

## Limitations

- RFC 6455 is the base spec. WebSocket-over-HTTP/2 (RFC 8441)
  changes the bootstrap; verify per stack if HTTP/2 is in play.
- Browser autobahn-suite-style edge cases (fragmentation, extension
  negotiation) are out of scope here; use Autobahn TestSuite for
  full conformance.

## References

- [RFC 6455] - WebSocket protocol (handshake, frames, close codes;
  section 7.2.3 reconnect backoff, 7.4.1 1006/1008/1009, 7.4.2 code ranges)
- [whatwg] - WHATWG WebSockets standard: `close()` code and reason rules
- [ws-api] - `ws` API: `maxPayload`, `perMessageDeflate` options,
  `server.close()`, `terminate()`, `closeTimeout`
- [ws-readme] - `ws` README: permessage-deflate defaults and memory warning
- [ws-src] - `ws` source: inflated size checked against `maxPayload`
  (`receiver.js`), valid close codes (`validation.js`), subprotocol errors
  (`websocket.js`)
- `server-sent-events-tests` - 
  one-way push alternative
- `grpc-streaming-test-author` (qa-grpc) - typed
  RPC streaming alternative

[RFC 6455]: https://datatracker.ietf.org/doc/html/rfc6455
[whatwg]: https://websockets.spec.whatwg.org/
[ws-api]: https://github.com/websockets/ws/blob/master/doc/ws.md
[ws-readme]: https://github.com/websockets/ws/blob/master/README.md
[ws-src]: https://github.com/websockets/ws/tree/master/lib
