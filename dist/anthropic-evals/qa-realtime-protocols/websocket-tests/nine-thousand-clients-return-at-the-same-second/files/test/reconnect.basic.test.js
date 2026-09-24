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
