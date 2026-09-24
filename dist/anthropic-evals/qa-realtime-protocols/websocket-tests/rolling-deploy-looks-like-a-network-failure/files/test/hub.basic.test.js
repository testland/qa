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
