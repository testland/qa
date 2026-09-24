import { createHmac, timingSafeEqual } from 'node:crypto';

export function sign(body, secret) {
  return createHmac('sha256', secret).update(body).digest('hex');
}

export function verify(body, secret, signature) {
  const expected = Buffer.from(sign(body, secret), 'utf8');
  const given = Buffer.from(String(signature ?? ''), 'utf8');
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}
