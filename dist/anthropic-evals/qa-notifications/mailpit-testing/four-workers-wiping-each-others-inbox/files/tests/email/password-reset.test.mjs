import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { clearInbox, trigger, waitForMessage, openMessage } from './mailbox.mjs';

beforeEach(clearInbox);

test('password reset email contains a reset link', async () => {
  await trigger('/_test/trigger-password-reset', 'qa@example.com');
  const found = await waitForMessage('qa@example.com');
  const msg = await openMessage(found.ID);
  assert.match(msg.Text, /\/reset\?token=[A-Za-z0-9_-]{20,}/);
});

test('password reset email is addressed to the requester', async () => {
  await trigger('/_test/trigger-password-reset', 'qa@example.com');
  const found = await waitForMessage('qa@example.com');
  assert.equal(found.To[0].Address, 'qa@example.com');
  assert.equal(found.Subject, 'Reset your password');
});
