# The gateway falls over ninety seconds after every deploy

## Problem Description

Our notification fanout service keeps a persistent connection per browser tab -
9,400 of them at the last count. The service itself restarts fine. What does
not is what happens immediately afterwards.

The accept queue saturates in one-second pulses. Here is the arrival histogram
from the 2026-09-04 rollout, bucketed by second from the moment the new pod
started accepting:

```
+0s     11
+1s   8,842     <-- accept queue full, 3,102 refused
+2s   3,166     <-- refused clients trying again
+3s   3,044
+4s   2,981
+5s   2,902
...
+87s     34
```

Every refusal produces another attempt exactly one second later, so the pulse
sustains itself for a minute and a half and the pod spends that time doing
nothing but TLS handshakes. Scaling the pool up moves the cliff, it does not
remove it.

`src/reconnect.js` is the client module that owns this. It has a test that
proves a dropped connection comes back, and that test has been green since it
was written, so nobody has looked at it.

Product's requirement is unchanged and reasonable: a user whose connection
drops should be back within a few seconds of the service being available. What
we do not have is any coverage that would have told us the fleet was going to
arrive as one block.

Do not change `createReconnector`'s signature - the client SDK is published and
three apps construct it.

## Output Specification

1. Add `test/reconnect.backoff.test.js`.
2. Change `src/reconnect.js` so the new tests pass.
3. Write `docs/reconnect-policy.md`: the delay schedule a client now follows,
   and what a 9,400-client fleet does to the accept queue under it.
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

  drop(code = 1006) {
    this.readyState = 'closed';
    this.emit('close', code);
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

test('a successful connection resets the attempt counter', () => {
  const { clock, reconnector, latest } = harness();

  reconnector.start();
  latest().drop();
  clock.tick(60_000);
  latest().succeed();

  assert.equal(reconnector.attempts, 0);
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

Ops note: the refusals are not capacity. Two pods idle at 4% CPU either side of
the window. Everything arrives in the same 100ms and the listen backlog is 4096.
