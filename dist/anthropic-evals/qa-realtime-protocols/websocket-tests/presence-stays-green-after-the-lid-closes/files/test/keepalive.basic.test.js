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
