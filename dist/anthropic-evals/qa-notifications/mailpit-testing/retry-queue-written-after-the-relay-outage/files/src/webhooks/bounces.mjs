import { users } from '../store.mjs';

// POST /webhooks/email-events
export async function handleDeliveryEvent(payload) {
  if (payload.RecordType === 'Bounce' && payload.Type === 'HardBounce') {
    const user = users.byEmail(payload.Email);
    if (user) users.update(user.id, { emailStatus: 'bounced' });
  }
  return { ok: true };
}
