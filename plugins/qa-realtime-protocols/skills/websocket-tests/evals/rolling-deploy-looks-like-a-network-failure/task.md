# Rolling deploys look like a network failure to every connected client

## Problem Description

`presence-gateway` holds one long-lived connection open per signed-in tab -
about 11,000 of them at peak. We ship three or four times a week and every
deploy produces the same support thread: "it lost my draft", "it signed me
out", "the dot went red".

The web client treats a clean ending and an unclean ending completely
differently, and that is the whole problem. When the connection ends cleanly it
shows a grey "reconnecting..." strip, keeps the composer contents and resumes
the session in place. When it ends any other way it assumes the network died:
red banner, in-memory session dropped, everything refetched from scratch.

Here is what the browser recorded during the 2026-09-04 rollout, alongside the
two other paths that end a connection from our side:

| path              | what triggers it                            | `event.code` | `event.wasClean` |
|-------------------|---------------------------------------------|--------------|------------------|
| duplicate session | a second tab signs in as the same user      | 1008         | true             |
| handler threw     | an unhandled error in a room subscription   | 1011         | true             |
| rolling deploy    | old pod stops accepting, drains, exits      | 1006         | false            |

Same client build, same browser, inside the same thirty seconds. The deploy
path is the only one the client treats as a disaster, and nothing in
`src/hub.js` is covered beyond "everyone ends up disconnected" - which is
equally true of all three.

I want every path that ends a connection from the server side pinned down, so
that the next person who touches the drain code cannot change what the client
sees without something going red. Start from what the client actually observes,
not from what we intended.

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

  // The peer has not been heard from in two minutes; nobody is left to answer a close frame.
  idleSweep(at) {
    for (const [socket, session] of this.sockets) {
      if (at - session.lastSeen > MAX_IDLE_MS) {
        socket.terminate();
      }
    }
  }

  drain() {
    for (const socket of this.sockets.keys()) {
      socket.terminate();
    }
    this.sockets.clear();
  }
}

module.exports = { Hub, MAX_IDLE_MS };

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

  // Writes a close frame; the peer echoes it and the connection finishes cleanly.
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

  // Drops the connection with no close frame written; the peer synthesises its own ending.
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

=============== FILE: reports/close-events-2026-09-04.md ===============
# Client-side close events, rollout window 20:02-20:05 UTC

Collected by the web client's error reporter. One line per ended connection,
sampled at 2%.

```
20:02:41  session=9f31 code=1008 clean=true  reason="duplicate session"
20:03:07  session=1a04 code=1011 clean=true  reason="internal error"
20:04:12  session=77bc code=1006 clean=false reason=""
20:04:12  session=2e91 code=1006 clean=false reason=""
20:04:12  session=b350 code=1006 clean=false reason=""
20:04:13  session=0c7a code=1006 clean=false reason=""
20:04:13  session=41ff code=1006 clean=false reason=""
20:04:14  session=d208 code=1006 clean=false reason=""
```

Banner impressions in the same window: 9,318. Drafts restored from local
storage: 0 - the client only keeps the composer when the ending was clean.

The old pod's shutdown log for the same window:

```
20:04:11  SIGTERM received, entering drain
20:04:11  drain: 9412 connections
20:04:12  drain complete in 411ms
20:04:12  process exit 0
```
