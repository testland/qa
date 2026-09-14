import { sendWithRetry } from './mailer.mjs';
import { users } from './store.mjs';

export async function sendPasswordReset(transport, user, token) {
  const message = {
    from: 'security@example.com',
    to: user.email,
    subject: 'Reset your password',
    text: `Reset your password: https://app.example.com/reset?token=${token}`,
  };

  const result = await sendWithRetry(transport, message);
  users.update(user.id, { lastResetSentAt: new Date().toISOString() });
  return result;
}
