import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadEnv } from '../../scripts/load-env.mjs';
import { smtpConfig } from '../../src/mailer-config.mjs';
import { sendPasswordReset } from '../../src/notifications.mjs';
import { createTransport } from '../../src/transport.mjs';

loadEnv();
const API = process.env.MAIL_API;

beforeEach(async () => {
  await fetch(`${API}/api/v1/messages`, { method: 'DELETE' });
});

async function waitForMessage(to, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${API}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
    const { messages = [] } = await res.json();
    if (messages.length) {
      return (await fetch(`${API}/api/v1/message/${messages[0].ID}`)).json();
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`no mail for ${to} within ${timeoutMs}ms`);
}

test('password reset is delivered over the configured relay', async () => {
  const transport = createTransport(smtpConfig());
  await sendPasswordReset(transport, { id: 'u1', email: 'alice@example.com' }, 'tok-9931');
  const msg = await waitForMessage('alice@example.com');
  assert.equal(msg.Subject, 'Reset your password');
  assert.match(msg.Text, /\/reset\?token=/);
});
