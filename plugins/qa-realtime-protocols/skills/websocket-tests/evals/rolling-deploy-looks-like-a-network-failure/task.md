# Every deploy produces the same support thread

## Problem Description

`presence-gateway` holds one long-lived connection open per signed-in tab -
about 11,000 of them at peak. We ship three or four times a week and every
deploy produces the same support thread: "it lost my draft", "it signed me
out", "the dot went red".

The web client branches on how a connection ended. A clean ending gets a grey
"reconnecting..." strip: the composer contents are kept and the session resumes
in place. Anything else is treated as the network having died - red banner,
in-memory session dropped, everything refetched from scratch.

Here is what the browser recorded during last week's rollout, alongside the
other paths that end a connection from our side. Same client build, same
browser, inside the same few minutes:

| path              | what triggers it                            | `event.code` | `event.wasClean` |
|-------------------|---------------------------------------------|--------------|------------------|
| duplicate session | a second tab signs in as the same user      | 1008         | true             |
| handler threw     | an unhandled error in a room subscription   | 1011         | true             |
| idle sweep        | nothing heard from the peer for two minutes | 1006         | false            |
| rolling deploy    | old pod stops accepting, drains, exits      | 1006         | false            |

@jlind put a hotfix into `src/hub.js` on the 11th so that the drain path writes
an explicit close frame instead of just dropping the socket. The support thread
after the next deploy was the same size. The numbers either side of the hotfix
are in `reports/close-events.md`.

Nothing in `src/hub.js` is covered beyond "everyone ends up disconnected",
which is equally true of all four paths. I want every path that ends a
connection from the server side pinned down, so that the next person who
touches this code cannot change what the client sees without something going
red. Start from what the client actually observes.

## Output Specification

1. Add `test/hub.close-codes.test.js` covering every path in `src/hub.js` that
   ends a connection from the server side.
2. Write `docs/close-codes.md`: one row per path - what triggers it, what the
   peer observes, and whether the connection ended cleanly.
3. Run `npm test` before you finish; it must pass.
4. Leave `test/hub.basic.test.js` in place.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "presence-gateway",
  "version": "4.2.1",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/hub.js ===============
'use strict';

const MAX_IDLE_MS = 120_000;

// 2026-09-11 hotfix: announce the drain with a real close frame instead of
// dropping the socket, so the ending is not a surprise to the client.
const DRAIN_CLOSE_CODE = 1006;
const DRAIN_REASON =
  'presence-gateway is being replaced by a rolling deploy; the new pod is already accepting connections, so reconnect now and your session will resume where it left off';

class Hub {
  constructor() {
    this.sockets = new Map();
  }

  get size() {
    return this.sockets.size;
  }

  add(socket, session) {
    this.sockets.set(socket, session);
    socket.on('close', () => this.sockets.delete(socket));
  }

  broadcast(event) {
    const frame = JSON.stringify(event);
    for (const socket of this.sockets.keys()) {
      socket.send(frame);
    }
  }

  kick(socket, reason) {
    socket.close(1008, reason);
  }

  fail(socket) {
    socket.close(1011, 'internal error');
  }

  idleSweep(at) {
    for (const [socket, session] of this.sockets) {
      if (at - session.lastSeen > MAX_IDLE_MS) {
        socket.terminate();
      }
    }
  }

  drain() {
    for (const socket of this.sockets.keys()) {
      socket.close(DRAIN_CLOSE_CODE, DRAIN_REASON);
    }
    this.sockets.clear();
  }
}

module.exports = { Hub, MAX_IDLE_MS, DRAIN_CLOSE_CODE, DRAIN_REASON };

=============== FILE: testutil/fake-socket.js ===============
'use strict';

const { EventEmitter } = require('node:events');

// Stands in for one server-side connection and records the control frames written to it.
class FakeSocket extends EventEmitter {
  constructor(id) {
    super();
    this.id = id;
    this.sent = [];
    this.closeFrame = null;
    this.terminated = false;
    this.readyState = 'open';
  }

  send(frame) {
    this.sent.push(frame);
  }

  close(code, reason = '') {
    if (this.readyState !== 'open') {
      return;
    }
    this.closeFrame = { code, reason };
    this.readyState = 'closing';
    process.nextTick(() => {
      this.readyState = 'closed';
      this.emit('close', code, reason, true);
    });
  }

  terminate() {
    if (this.readyState === 'closed') {
      return;
    }
    this.terminated = true;
    this.readyState = 'closed';
    process.nextTick(() => this.emit('close', 1006, '', false));
  }
}

module.exports = { FakeSocket };

=============== FILE: test/hub.basic.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { Hub } = require('../src/hub');
const { FakeSocket } = require('../testutil/fake-socket');

function connect(hub, id, lastSeen = 0) {
  const socket = new FakeSocket(id);
  hub.add(socket, { lastSeen });
  return socket;
}

test('broadcast reaches every connected socket', () => {
  const hub = new Hub();
  const a = connect(hub, 'a');
  const b = connect(hub, 'b');

  hub.broadcast({ type: 'presence', online: 2 });

  assert.deepEqual(a.sent, ['{"type":"presence","online":2}']);
  assert.deepEqual(b.sent, ['{"type":"presence","online":2}']);
});

test('a kicked socket is dropped from the hub', async () => {
  const hub = new Hub();
  const socket = connect(hub, 'a');

  hub.kick(socket, 'duplicate session');
  await once(socket, 'close');

  assert.equal(hub.size, 0);
});

test('an idle socket is swept', async () => {
  const hub = new Hub();
  const socket = connect(hub, 'a', 0);

  hub.idleSweep(500_000);
  await once(socket, 'close');

  assert.equal(hub.size, 0);
});

test('drain disconnects everyone', async () => {
  const hub = new Hub();
  const a = connect(hub, 'a');
  const b = connect(hub, 'b');

  hub.drain();
  await Promise.all([once(a, 'close'), once(b, 'close')]);

  assert.equal(hub.size, 0);
});

=============== FILE: reports/close-events.md ===============
# Client-side close events, collected by the web client's error reporter

One line per ended connection, sampled at 2%.

## Rollout 2026-09-04, 20:02-20:05 UTC - before the hotfix

```
20:02:41  session=9f31 code=1008 clean=true  reason="duplicate session"
20:03:07  session=1a04 code=1011 clean=true  reason="internal error"
20:04:12  session=77bc code=1006 clean=false reason=""
20:04:12  session=2e91 code=1006 clean=false reason=""
20:04:13  session=0c7a code=1006 clean=false reason=""
```

Banner impressions in the window: 9,318. Drafts restored from local storage: 0.

Old pod shutdown log:

```
20:04:11  SIGTERM received, entering drain
20:04:11  drain: 9412 connections
20:04:12  drain complete in 411ms
20:04:12  process exit 0
```

## Rollout 2026-09-12, 19:31-19:34 UTC - after the hotfix

```
19:31:58  session=b2d5 code=1008 clean=true  reason="duplicate session"
19:33:40  session=44a1 code=1006 clean=false reason=""
19:33:40  session=8e02 code=1006 clean=false reason=""
19:33:41  session=c117 code=1006 clean=false reason=""
```

Banner impressions in the window: 9,104. Drafts restored from local storage: 0.

The client's reporter records `event.code` and `event.wasClean` exactly as the
browser hands them over; it does not synthesise either field.
