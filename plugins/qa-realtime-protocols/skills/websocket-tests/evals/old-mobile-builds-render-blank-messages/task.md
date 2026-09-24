# Chat 3.x renders blank message bodies and 2.9 stopped connecting altogether

## Problem Description

Two weeks ago we shipped `chat-v2`, a compact frame shape for the chat stream -
short field names, ~40% fewer bytes on mobile data. The 4.x app negotiates it
and everything is fine there.

Since then support has two piles. The first is screenshots from 3.x users: the
message list renders the right number of rows, with the right timestamps in the
gutter, and every body is empty. The second is 2.9.0 users, who no longer get a
session at all - the client's reporter records a failed handshake and nothing
else. 3.x and 2.9 together are 21% of daily actives and we cannot force-upgrade
them until store review clears, which is at best nine days away.

Backend's position is that none of this can be us: 3.x clients ask for
`chat-v1`, we honour what a client asks for, and there is a test that says so.
That test is `test/negotiate.basic.test.js` and it is green.

@dsoto has a fix up already - the diff and his reasoning are in
`docs/proposed-fix.md` - and he wants it in today's hotfix train. I would like
your read on it before it goes in, and then whatever you think the right change
is, landed with tests behind it. `logs/upgrade-requests.log` is this morning's
capture from the edge proxy and `reports/support-summary.md` is what support
has counted.

The reason any of this got out is that nothing asserts what the server actually
answers a client with. The only thing anyone checks is that messages arrive.

## Output Specification

1. Add `test/negotiate.upgrade.test.js` covering what a 3.x client, a 4.x
   client and a 2.9 client each get back from the handshake.
2. Write `docs/subprotocol-matrix.md`: one row per offer we can receive from a
   client, what we answer with, and the frame shape that follows from it.
3. Land a fix in `src/negotiate.js`. Do not change `src/frames.js`.
4. Run `npm test` before you finish; it must pass, and
   `test/negotiate.basic.test.js` must stay exactly as it is.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "chat-edge",
  "version": "2.4.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/negotiate.js ===============
'use strict';

const SUPPORTED = ['chat-v2', 'chat-v1'];

function selectSubprotocol(headers) {
  const offered = (headers['Sec-WebSocket-Protocol'] || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const match = SUPPORTED.find((candidate) => offered.includes(candidate));

  return match || SUPPORTED[0];
}

function handleUpgrade(request) {
  const protocol = selectSubprotocol(request.headers);

  return {
    status: 101,
    headers: {
      Upgrade: 'websocket',
      Connection: 'Upgrade',
      'Sec-WebSocket-Protocol': protocol,
    },
    protocol,
  };
}

module.exports = { selectSubprotocol, handleUpgrade, SUPPORTED };

=============== FILE: src/frames.js ===============
'use strict';

function encodeMessage(protocol, message) {
  if (protocol === 'chat-v2') {
    return JSON.stringify({
      i: message.id,
      b: message.body,
      u: message.author,
      t: message.sentAt,
    });
  }

  return JSON.stringify({
    id: message.id,
    body: message.body,
    author: message.author,
    sent_at: message.sentAt,
  });
}

module.exports = { encodeMessage };

=============== FILE: docs/proposed-fix.md ===============
# Hotfix: stop handing chat-v2 to clients that cannot parse it

Author: @dsoto  ·  2026-09-12  ·  targets the 16:00 hotfix train

The header lookup is spelled with capitals and the runtime hands us something
else, so `offered` comes back empty and the selection falls through. Two lines:
look the header up without caring about case, and make the fall-through land on
the old frame shape instead of the new one, which is what the affected clients
can parse. Low risk, ships today, buys us the nine days.

```diff
 function selectSubprotocol(headers) {
-  const offered = (headers['Sec-WebSocket-Protocol'] || '')
+  const name = Object.keys(headers).find((key) => key.toLowerCase() === 'sec-websocket-protocol');
+  const offered = String((name ? headers[name] : '') || '')
     .split(',')
     .map((value) => value.trim())
     .filter(Boolean);
 
   const match = SUPPORTED.find((candidate) => offered.includes(candidate));
 
-  return match || SUPPORTED[0];
+  // Safest default for anything old: the frame shape every build can read.
+  return match || 'chat-v1';
 }
```

I have run the existing suite against this and it is green.

=============== FILE: test/negotiate.basic.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { selectSubprotocol, handleUpgrade } = require('../src/negotiate');
const { encodeMessage } = require('../src/frames');

test('prefers chat-v2 when the client offers both', () => {
  assert.equal(selectSubprotocol({ 'Sec-WebSocket-Protocol': 'chat-v1, chat-v2' }), 'chat-v2');
});

test('honours a chat-v1 only offer', () => {
  assert.equal(selectSubprotocol({ 'Sec-WebSocket-Protocol': 'chat-v1' }), 'chat-v1');
});

test('upgrade answers 101 and echoes the selected protocol', () => {
  const response = handleUpgrade({ headers: { 'Sec-WebSocket-Protocol': 'chat-v2' } });

  assert.equal(response.status, 101);
  assert.equal(response.headers['Sec-WebSocket-Protocol'], 'chat-v2');
});

test('v1 frames carry the long field names', () => {
  const frame = JSON.parse(encodeMessage('chat-v1', {
    id: 7,
    body: 'see you at six',
    author: 'ana',
    sentAt: 1757000000000,
  }));

  assert.equal(frame.body, 'see you at six');
  assert.equal(frame.sent_at, 1757000000000);
});

=============== FILE: logs/upgrade-requests.log ===============
# edge proxy capture, 2026-09-12, request and response verbatim

--- device A, app 3.4.2 (iOS 16) ----------------------------------------
GET /stream HTTP/1.1
host: chat.example.com
upgrade: websocket
connection: Upgrade
sec-websocket-key: x3JJHMbDL1EzLkh9GBhXDw==
sec-websocket-version: 13
sec-websocket-protocol: chat-v1

HTTP/1.1 101 Switching Protocols
upgrade: websocket
connection: Upgrade
sec-websocket-protocol: chat-v2

session held 14 min, 212 frames delivered

--- device B, app 4.1.0 (Android 14) ------------------------------------
GET /stream HTTP/1.1
host: chat.example.com
upgrade: websocket
connection: Upgrade
sec-websocket-key: dGhlIHNhbXBsZSBub25jZQ==
sec-websocket-version: 13
sec-websocket-protocol: chat-v2, chat-v1

HTTP/1.1 101 Switching Protocols
upgrade: websocket
connection: Upgrade
sec-websocket-protocol: chat-v2

session held 31 min, 508 frames delivered

--- device C, app 2.9.0 (Android 11, subprotocol support added in 3.0) ---
GET /stream HTTP/1.1
host: chat.example.com
upgrade: websocket
connection: Upgrade
sec-websocket-key: 7GDNsbUm5ldtaYCzPqPZjw==
sec-websocket-version: 13

HTTP/1.1 101 Switching Protocols
upgrade: websocket
connection: Upgrade
sec-websocket-protocol: chat-v2

session ended 41 ms later, 0 frames delivered, client reconnected and repeated

=============== FILE: reports/support-summary.md ===============
# Blank bodies and failed sessions - support summary, 2026-09-12

| app build | sessions sampled | outcome                                  |
|-----------|------------------|------------------------------------------|
| 4.1.0     | 400              | fine                                     |
| 3.4.2     | 400              | 400 connected, every message body blank  |
| 3.0.1     | 120              | 120 connected, every message body blank  |
| 2.9.0     | 60               | 0 connected; handshake reported as failed, client retries and fails again |

On 3.x, row count and timestamps are right in every sample; only the body text
is missing. 2.9.0 predates subprotocol support in the mobile client entirely -
it sends no offer - and it was connecting normally until the chat-v2 rollout.
