import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendWithRetry } from '../src/mailer.mjs';

function transportThatSucceeds() {
  const sent = [];
  return {
    sent,
    async send(message) {
      sent.push(message);
      return { accepted: [message.to], messageId: `m-${sent.length}` };
    },
  };
}

const message = { from: 'security@example.com', to: 'alice@example.com', subject: 'Reset your password', text: 'hi' };

test('returns the transport result on the first attempt', async () => {
  const transport = transportThatSucceeds();
  const result = await sendWithRetry(transport, message);
  assert.deepEqual(result.accepted, ['alice@example.com']);
  assert.equal(transport.sent.length, 1);
});

test('retries once after a transient failure and then succeeds', async () => {
  let calls = 0;
  const transport = {
    async send(m) {
      calls += 1;
      if (calls === 1) {
        const err = new Error('421 4.7.0 Too many concurrent connections');
        err.responseCode = 421;
        throw err;
      }
      return { accepted: [m.to], messageId: 'm-2' };
    },
  };
  const result = await sendWithRetry(transport, message, { delayMs: 1 });
  assert.deepEqual(result.accepted, ['alice@example.com']);
  assert.equal(calls, 2);
});
