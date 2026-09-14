'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { verifyAndParse } = require('../../src/webhookVerify');

const SECRET = 'whsec_unit_test_secret';

function header(payload, secret = SECRET) {
  const t = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac('sha256', secret).update(`${t}.${payload}`, 'utf8').digest('hex');
  return `t=${t},v1=${signature}`;
}

test('a correctly signed payload is parsed', () => {
  const payload = JSON.stringify({ id: 'evt_unit_1', type: 'charge.refunded' });
  const event = verifyAndParse(payload, header(payload), SECRET);
  assert.equal(event.id, 'evt_unit_1');
});

test('a payload signed with another secret is rejected', () => {
  const payload = JSON.stringify({ id: 'evt_unit_2', type: 'charge.refunded' });
  assert.throws(() => verifyAndParse(payload, header(payload, 'whsec_someone_else'), SECRET), /signature mismatch/);
});
