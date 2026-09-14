import test from 'node:test';
import assert from 'node:assert/strict';
import { sign, verify } from '../src/webhook.js';

test('[risk:R-007] accepts a webhook carrying a valid signature', () => {
  const body = '{"event":"payout.settled","id":"po_1"}';
  assert.equal(verify(body, 'shh', sign(body, 'shh')), true);
});

test('[risk:R-007] rejects a webhook whose body was tampered with', () => {
  const body = '{"event":"payout.settled","id":"po_1"}';
  const signature = sign(body, 'shh');
  assert.equal(verify('{"event":"payout.settled","id":"po_2"}', 'shh', signature), false);
});
