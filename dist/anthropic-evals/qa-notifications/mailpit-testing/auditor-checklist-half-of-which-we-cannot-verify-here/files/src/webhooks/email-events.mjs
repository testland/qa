import { users } from '../store.mjs';

// POST /webhooks/email-events — Postmark posts delivery events here.
export async function handleEmailEvent(payload) {
  if (payload.RecordType === 'Bounce' && payload.TypeCode === 1) {
    const user = users.byEmail(payload.Email);
    if (user) users.update(user.id, { emailStatus: 'bounced' });
  }
  return { ok: true };
}
