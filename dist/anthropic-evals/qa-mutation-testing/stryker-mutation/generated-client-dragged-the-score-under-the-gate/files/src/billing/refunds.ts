import type { Charge, RefundOutcome } from './types';

const WINDOW_DAYS = 45;
const MS_PER_DAY = 86400000;

export function isRefundable(charge: Charge, now: Date): boolean {
  const ageDays = (now.getTime() - charge.capturedAt.getTime()) / MS_PER_DAY;
  if (ageDays > WINDOW_DAYS) return false;
  if (charge.disputed) return false;
  return charge.capturedCents > charge.refundedCents;
}

export function refundCents(charge: Charge, requestedCents: number): RefundOutcome {
  const remaining = charge.capturedCents - charge.refundedCents;
  if (requestedCents <= 0) return { ok: false, cents: 0, reason: 'non-positive' };
  if (requestedCents > remaining) return { ok: false, cents: 0, reason: 'exceeds-remaining' };
  const fee = charge.feeRefundable ? 0 : Math.round(charge.feeCents * (requestedCents / charge.capturedCents));
  return { ok: true, cents: requestedCents - fee, reason: 'ok' };
}
