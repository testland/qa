const WINDOW_DAYS = [1, 3, 7];

export function isEligible(payout) {
  if (payout.status === 'held') return false;
  if (payout.amountCents <= 0) return false;
  return payout.attempt < WINDOW_DAYS.length;
}

export function scheduledFor(payout, now) {
  if (!isEligible(payout)) return null;
  const days = WINDOW_DAYS[payout.attempt];
  return new Date(now.getTime() + days * 86400000);
}

export function feeCents(amountCents, rate) {
  return Math.round(amountCents * rate);
}
