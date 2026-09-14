import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { clearInbox, trigger, waitForMessage, latestMessage } from './mailbox.mjs';

beforeEach(clearInbox);

test('welcome email greets the new user', async () => {
  await trigger('/_test/trigger-welcome', 'newuser@example.com');
  const found = await waitForMessage('newuser@example.com');
  assert.ok(found.Snippet.includes('Welcome to Harbour'));
});

test('welcome email is sent from the no-reply address', async () => {
  await trigger('/_test/trigger-welcome', 'newuser@example.com');
  await new Promise((r) => setTimeout(r, 250));
  const msg = await latestMessage();
  assert.equal(msg.From.Address, 'noreply@example.com');
});
