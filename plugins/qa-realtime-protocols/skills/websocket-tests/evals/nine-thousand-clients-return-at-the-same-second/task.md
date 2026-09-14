# The gateway spends ninety seconds after every deploy doing nothing but handshakes

## Problem Description

Our notification fanout service keeps a persistent connection per browser tab -
9,400 of them at the last count. The service itself restarts fine. What does
not is what happens immediately afterwards.

Arrival histogram from the 2026-09-04 rollout, bucketed by second from the
moment the new pod started accepting:

```
+0s     11
+1s   8,842     <-- accept queue full, 3,102 refused
+2s   3,166
+3s   3,044
+4s   2,981
+5s   2,902
...
+87s     34
```

For ninety seconds the pod does nothing but TLS handshakes, and p99
time-to-first-frame goes from 0.21s to 38.4s. The rollout numbers are in
`reports/rollout-2026-09-04.md`.

While digging into that, the on-call also pulled an accept-log sample from a
quiet afternoon with no deploy anywhere near it and found a steady background of
connections being opened and closed over and over. He put it down to a scanner
and moved on; the sample is in `reports/accept-sample-2026-09-09.md` if it is
worth anything.

`src/reconnect.js` is the client module that owns all of this. It has a test
that proves a dropped connection comes back, and that test has been green since
it was written, so nobody has looked at it. Product's requirement is unchanged
and reasonable: a user whose connection drops should be back within a few
seconds of the service being available.

Do not change `createReconnector`'s signature - the client SDK is published and
three apps construct it.

## Output Specification

1. Add `test/reconnect.backoff.test.js`.
2. Change `src/reconnect.js` so the new tests pass.
3. Write `docs/reconnect-policy.md` describing what a client does after a
   connection ends.
4. Run `npm test` before you finish; it must pass, and
   `test/reconnect.basic.test.js` must stay exactly as it is.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "fanout-client",
  "version": "3.7.2",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/reconnect.js ===============
'use strict';

const RETRY_DELAY_MS = 1000;

function createReconnector(options) {
  const { open, schedule = setTimeout, maxAttempts = 10 } = options;
  let attempts = 0;
  let stopped = false;
  const delays = [];

  function attempt() {
    if (stopped) {
      return null;
    }
    attempts += 1;
    const socket = open();
    socket.on('open', () => {
      attempts = 0;
    });
    socket.on('close', () => {
      retry();
    });
    return socket;
  }

  function retry() {
    if (stopped || attempts >= maxAttempts) {
      return;
    }
    const delay = RETRY_DELAY_MS;
    delays.push(delay);
    schedule(attempt, delay);
  }

  return {
    start: attempt,
    stop() {
      stopped = true;
    },
    get attempts() {
      return attempts;
    },
    get delays() {
      return delays.slice();
    },
  };
}

module.exports = { createReconnector, RETRY_DELAY_MS };

=============== FILE: testutil/clock.js ===============
'use strict';

// Deterministic stand-in for setTimeout; queued work runs only when the clock is advanced.
function createClock() {
  let now = 0;
  let tasks = [];

  return {
    schedule(fn, delay) {
      const task = { at: now + delay, fn };
      tasks.push(task);
      return task;
    },
    time() {
      return now;
    },
    pending() {
      return tasks.length;
    },
    tick(ms) {
      const until = now + ms;
      for (;;) {
        tasks.sort((a, b) => a.at - b.at);
        const next = tasks[0];
        if (!next || next.at > until) {
          break;
        }
        tasks = tasks.slice(1);
        now = next.at;
        next.fn();
      }
      now = until;
    },
  };
}

module.exports = { createClock };

=============== FILE: testutil/fake-client-socket.js ===============
'use strict';

const { EventEmitter } = require('node:events');

class FakeClientSocket extends EventEmitter {
  constructor() {
    super();
    this.readyState = 'connecting';
  }

  succeed() {
    this.readyState = 'open';
    this.emit('open');
  }

  drop(code = 1006, reason = '') {
    this.readyState = 'closed';
    this.emit('close', code, reason);
  }
}

module.exports = { FakeClientSocket };

=============== FILE: test/reconnect.basic.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createReconnector } = require('../src/reconnect');
const { createClock } = require('../testutil/clock');
const { FakeClientSocket } = require('../testutil/fake-client-socket');

function harness(overrides = {}) {
  const clock = createClock();
  const opened = [];
  const reconnector = createReconnector({
    open: () => {
      const socket = new FakeClientSocket();
      opened.push(socket);
      return socket;
    },
    schedule: clock.schedule,
    ...overrides,
  });
  return { clock, opened, reconnector, latest: () => opened[opened.length - 1] };
}

test('reconnects after the connection drops', () => {
  const { clock, opened, reconnector, latest } = harness();

  reconnector.start();
  latest().drop();
  clock.tick(60_000);

  assert.equal(opened.length, 2);
});

test('stops after maxAttempts consecutive failures', () => {
  const { clock, opened, reconnector, latest } = harness({ maxAttempts: 3 });

  reconnector.start();
  for (let i = 0; i < 5; i += 1) {
    latest().drop();
    clock.tick(60_000);
  }

  assert.equal(opened.length, 3);
});

test('stop() prevents a scheduled attempt from running', () => {
  const { clock, opened, reconnector, latest } = harness();

  reconnector.start();
  latest().drop();
  reconnector.stop();
  clock.tick(60_000);

  assert.equal(opened.length, 1);
});

=============== FILE: reports/rollout-2026-09-04.md ===============
# Fanout rollout, 2026-09-04 20:04 UTC

| metric                            | value    |
|-----------------------------------|----------|
| connections before SIGTERM        | 9,412    |
| new pod ready                     | 20:04:12 |
| accept queue depth at +1s         | full     |
| connections refused, +1s to +6s   | 14,970   |
| time to steady state              | 91s      |
| p99 time-to-first-frame, +0..+90s | 38.4s    |
| p99 time-to-first-frame, steady   | 0.21s    |

Two pods idle at 4% CPU either side of the window. Listen backlog 4096. Pool
was scaled from 2 to 6 replicas for the 2026-08-28 rollout; the same shape
appeared, with the cliff one second later.

=============== FILE: reports/accept-sample-2026-09-09.md ===============
# Accept log, 2026-09-09 14:00-14:05 UTC. No deploy in this window or the day around it.

| client session | connections opened in the 5 min | how each one ended                   |
|----------------|---------------------------------|--------------------------------------|
| s_4471         | 300                             | server close, code 1008, "session revoked" |
| s_9002         | 299                             | server close, code 1008, "session revoked" |
| s_1188         | 298                             | server close, code 1008, "session revoked" |
| s_0c7a         | 297                             | server close, code 1008, "session revoked" |
| everything else| 1-3                             | still open at the end of the window   |

617 sessions are in the first pattern, together 184,000 of the 187,000 accepts
in the window. Each of those sessions belongs to a user who changed their
password or signed out on another device: the gateway reads the stale token,
closes the connection, and the same client is back on the next second.

Oldest session in the pattern started 2026-08-27 and has not stopped since.
Support tickets that are probably this: "app kills my battery", "fan spins up
after I change my password", 41 of them open.
