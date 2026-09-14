# Chat 3.x builds started rendering blank message bodies

## Problem Description

Two weeks ago we shipped `chat-v2`, a compact frame shape for the chat stream -
short field names, ~40% less bytes on mobile data. The 4.x app negotiates it and
everything is fine there.

Then support started collecting screenshots from 3.x users: the message list
renders the right number of rows, with the right timestamps in the gutter, and
every body is empty. 3.x is 18% of daily actives and we cannot force-upgrade
them until the store review clears, which is at best nine days away.

Backend's position is that this cannot be us: 3.x clients ask for `chat-v1`, we
honour what a client asks for, and there is a test that says so. That test is in
`test/negotiate.basic.test.js` and it is green.

`logs/upgrade-requests.log` is the raw capture from the edge proxy for a 3.4.2
device and a 4.1.0 device, request and response, taken this morning. Read it
before you touch anything - it does not agree with backend's position.

Whatever is wrong here, the reason it got out is that nothing asserts what the
server actually answers a client with. The only thing anyone checks is that
messages arrive.

## Output Specification

1. Add `test/negotiate.upgrade.test.js` covering the handshake outcome a 3.x
   client gets and the handshake outcome a 4.x client gets, driven through
   `handleUpgrade` with requests shaped the way the log shows them arriving.
2. Write `docs/subprotocol-matrix.md`: one row per offer we can receive from a
   client, what we answer with, and the frame shape that follows from it.
3. Fix `src/negotiate.js`. Do not change `src/frames.js`.
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

  // Fall back to the newest protocol so a client we do not recognise still connects.
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
# edge proxy capture, 2026-09-12, header names as delivered to the handler

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

=============== FILE: reports/support-summary.md ===============
# Blank message bodies - support summary, 2026-09-12

| app build | sessions sampled | blank bodies | rows rendered |
|-----------|------------------|--------------|---------------|
| 4.1.0     | 400              | 0            | correct       |
| 3.4.2     | 400              | 400          | correct       |
| 3.0.1     | 120              | 120          | correct       |
| 2.9.0     | 60               | 60           | correct       |

Row count and timestamps are right in every sample, only the body text is
missing. 2.9.0 predates subprotocol support in the mobile client entirely and
is affected the same way.
