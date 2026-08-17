'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createExpiringStore,
  createNotifier,
  createTransport,
} = require('./notificationDedup');

test('a repeated notification is suppressed', () => {
  let clock = 0;
  const transport = createTransport();
  const store = createExpiringStore({ now: () => clock });
  const send = createNotifier({ store, transport });
  const notification = { userId: 'u_1', kind: 'digest' };

  assert.equal(send(notification).status, 'sent');
  assert.equal(send(notification).status, 'suppressed');
  assert.equal(transport.deliveredCount(), 1);
});
