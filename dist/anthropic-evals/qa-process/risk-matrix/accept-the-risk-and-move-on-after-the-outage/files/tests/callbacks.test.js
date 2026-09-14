import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifySignature, deliverWithRetry, handleCallback } from '../src/callbacks.js';
import { createDeadLetterQueue } from '../src/deadletter.js';

const sign = (body, secret) => createHmac('sha256', secret).update(body).digest('hex');

test('accepts a callback with a valid signature', () => {
  const body = '{"type":"payment.captured","order":"o_1"}';
  assert.equal(verifySignature(body, 'shh', sign(body, 'shh')), true);
});

test('rejects a callback whose signature does not match', () => {
  const body = '{"type":"payment.captured","order":"o_1"}';
  assert.equal(verifySignature(body, 'shh', sign(body, 'nope')), false);
});

test('applies a verified callback to the order', () => {
  const body = '{"type":"payment.captured","order":"o_1"}';
  const applied = [];
  handleCallback(
    { body, signature: sign(body, 'shh') },
    { verify: verifySignature, secret: 'shh', onApply: (e) => applied.push(e.order) },
  );
  assert.deepEqual(applied, ['o_1']);
});

test('retries a failing delivery and succeeds on the second attempt', async () => {
  const seen = [];
  const send = async (event, attempt) => {
    seen.push(attempt);
    if (attempt < 2) throw new Error('503');
    return 'ok';
  };
  assert.equal(await deliverWithRetry(send, { id: 'e_1' }), 'ok');
  assert.deepEqual(seen, [1, 2]);
});

test('raises after the attempt budget is spent', async () => {
  const send = async () => {
    throw new Error('503');
  };
  await assert.rejects(() => deliverWithRetry(send, { id: 'e_1' }), /503/);
});

test('risk:R-003 an exhausted callback is handed to the dead-letter queue', async () => {
  const flushed = [];
  const store = { flush: async (batch) => { flushed.push(...batch); }, take: async () => [] };
  const dlq = createDeadLetterQueue({ store });
  const send = async () => {
    throw new Error('503');
  };
  await assert.rejects(() => deliverWithRetry(send, { id: 'e_1' }, { deadLetter: dlq }), /503/);
  assert.equal(dlq.pending(), 1);
});
