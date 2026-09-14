# People show as online for hours after they shut the laptop

## Problem Description

Presence in our workspace app is driven straight off the gateway's connection
table: if the connection is in the table, the dot is green. Support has a
standing complaint queue about it - someone closes the lid at 18:00, gets messaged
at 21:00 by a colleague who can see them online, and nobody answers.

Ops numbers from this morning, one gateway pod:

```
open connections                       41,204
no inbound bytes for > 1h              26,118
no inbound bytes for > 6h               9,540
oldest connection with no inbound bytes  4d 06h
memory                                  6.1 GB / 8 GB limit
```

A laptop that sleeps never closes anything. The TCP connection just stops
existing on the client side and the pod keeps the socket, the session, the
subscription list and the presence row forever. Pods get recycled on memory
pressure roughly every two days and that is currently how these get cleaned up.

`src/keepalive.js` is supposed to be the thing that notices. It runs on every
connection and it has been running since launch. Its ping body carries the
per-session diagnostics blob the observability team asked for last month; their
dashboards read it.

There is a small suite on it already and it is green.

Keep the options shape of `startKeepalive` and the shape of what it returns -
`src/presence.js` and two other call sites use them.

## Output Specification

1. Add `test/keepalive.liveness.test.js` proving what the gateway does with a
   connection whose peer has gone away without closing it.
2. Change `src/keepalive.js` so the new tests pass.
3. Write `docs/keepalive.md`: the interval, the deadline, what happens when the
   deadline passes, and what the ping frame carries.
4. Run `npm test` before you finish; it must pass, and
   `test/keepalive.basic.test.js` must stay exactly as it is.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "workspace-gateway",
  "version": "5.1.3",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/keepalive.js ===============
'use strict';

const PING_INTERVAL_MS = 30_000;
const IDLE_LIMIT_MS = 90_000;

function diagnostics(session) {
  return JSON.stringify({
    kind: 'hb',
    session: session.id,
    user: session.userId,
    build: session.build,
    region: session.region,
    rooms: session.rooms,
    since: session.connectedAt,
  });
}

function startKeepalive(socket, session, options = {}) {
  const {
    interval = PING_INTERVAL_MS,
    schedule = setInterval,
    clear = clearInterval,
    now = Date.now,
  } = options;

  let lastSeen = now();

  socket.on('message', () => {
    lastSeen = now();
  });

  const timer = schedule(() => {
    socket.ping(diagnostics(session));
    lastSeen = now();
  }, interval);

  return {
    stop() {
      clear(timer);
    },
    lastSeenAt() {
      return lastSeen;
    },
    idleFor(at) {
      return at - lastSeen;
    },
  };
}

module.exports = { startKeepalive, diagnostics, PING_INTERVAL_MS, IDLE_LIMIT_MS };

=============== FILE: testutil/clock.js ===============
'use strict';

// Deterministic stand-in for setInterval; handlers run only when the clock is advanced.
function createClock() {
  let current = 0;
  const timers = [];

  return {
    now() {
      return current;
    },
    setInterval(fn, ms) {
      const timer = { fn, ms, next: current + ms, active: true };
      timers.push(timer);
      return timer;
    },
    clearInterval(timer) {
      if (timer) {
        timer.active = false;
      }
    },
    tick(ms) {
      const until = current + ms;
      for (;;) {
        const due = timers
          .filter((timer) => timer.active && timer.next <= until)
          .sort((a, b) => a.next - b.next)[0];
        if (!due) {
          break;
        }
        current = due.next;
        due.next = current + due.ms;
        due.fn();
      }
      current = until;
    },
  };
}

module.exports = { createClock };

=============== FILE: testutil/fake-socket.js ===============
'use strict';

const { EventEmitter } = require('node:events');

// Stands in for one server-side connection and records every frame written to it.
class FakeSocket extends EventEmitter {
  constructor(id) {
    super();
    this.id = id;
    this.sent = [];
    this.pings = [];
    this.pongs = [];
    this.closeFrame = null;
    this.terminated = false;
  }

  send(frame) {
    this.sent.push(frame);
  }

  ping(payload = '') {
    this.pings.push(payload);
  }

  pong(payload = '') {
    this.pongs.push(payload);
  }

  close(code, reason = '') {
    this.closeFrame = { code, reason };
    this.emit('close', code, reason, true);
  }

  terminate() {
    this.terminated = true;
    this.emit('close', 1006, '', false);
  }

  // The peer answers our ping.
  replyPong(payload = '') {
    this.emit('pong', payload);
  }

  // The peer sends us a data frame.
  deliver(frame) {
    this.emit('message', frame);
  }
}

module.exports = { FakeSocket };

=============== FILE: test/keepalive.basic.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { startKeepalive } = require('../src/keepalive');
const { createClock } = require('../testutil/clock');
const { FakeSocket } = require('../testutil/fake-socket');

function harness(overrides = {}) {
  const clock = createClock();
  const socket = new FakeSocket('s1');
  const session = {
    id: '5f2a9c14-7d3e-4a51-9b06-2c8d7e41f0a3',
    userId: 'u_88213',
    build: 'web-2026.9.2',
    region: 'eu-west-1',
    rooms: ['r_1042', 'r_2277', 'r_3910'],
    connectedAt: 1757000000000,
  };
  const keepalive = startKeepalive(socket, session, {
    schedule: clock.setInterval,
    clear: clock.clearInterval,
    now: clock.now,
    ...overrides,
  });
  return { clock, socket, session, keepalive };
}

test('pings once per interval while the peer is answering', () => {
  const { clock, socket } = harness();

  for (let i = 0; i < 3; i += 1) {
    clock.tick(30_000);
    socket.replyPong();
  }

  assert.equal(socket.pings.length, 3);
});

test('stops pinging after stop()', () => {
  const { clock, socket, keepalive } = harness();

  clock.tick(30_000);
  socket.replyPong();
  keepalive.stop();
  clock.tick(120_000);

  assert.equal(socket.pings.length, 1);
});

test('an inbound frame refreshes the last-seen stamp', () => {
  const { clock, socket, keepalive } = harness();

  clock.tick(20_000);
  socket.deliver('{"type":"typing"}');

  assert.equal(keepalive.idleFor(clock.now()), 0);
});

=============== FILE: reports/connection-age.md ===============
# Connection table, gateway pod 7 of 12, sampled 2026-09-13 09:00 UTC

| bucket, time since last inbound byte | connections | presence shown |
|--------------------------------------|-------------|----------------|
| < 1 min                              | 12,880      | online         |
| 1-15 min                             | 2,206       | online         |
| 15-60 min                            | 0           | online         |
| 1-6 h                                | 16,578      | online         |
| 6-24 h                               | 7,890       | online         |
| > 24 h                               | 1,650       | online         |

Outbound is healthy on all of them: the pod is still writing a frame to each
connection every 30 seconds and none of those writes fail. The 15-60 minute
bucket is empty because a real user either comes back inside fifteen minutes or
does not come back at all.
