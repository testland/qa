import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifySignature(body, secret, signature) {
  const expected = Buffer.from(createHmac('sha256', secret).update(body).digest('hex'), 'utf8');
  const given = Buffer.from(String(signature ?? ''), 'utf8');
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

export async function deliverWithRetry(send, event, { attempts = 3 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await send(event, attempt);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export function handleCallback(event, { verify, secret, onApply }) {
  if (!verify(event.body, secret, event.signature)) {
    throw new Error('bad signature');
  }
  return onApply(JSON.parse(event.body));
}
