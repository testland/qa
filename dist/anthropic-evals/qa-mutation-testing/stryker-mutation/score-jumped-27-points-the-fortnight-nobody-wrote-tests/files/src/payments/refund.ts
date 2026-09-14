import { RefundRequest, RefundDecision } from './types';

// Stryker disable all

const REFUND_WINDOW_DAYS = 30;
const MS_PER_DAY = 86400000;

export function withinWindow(paidAt: Date, now: Date): boolean {
  const ageDays = (now.getTime() - paidAt.getTime()) / MS_PER_DAY;
  return ageDays <= REFUND_WINDOW_DAYS;
}

export function refundable(req: RefundRequest, now: Date): RefundDecision {
  if (!withinWindow(req.paidAt, now)) {
    return { ok: false, reason: 'window-expired', amountCents: 0 };
  }
  if (req.amountCents > req.paidCents - req.alreadyRefundedCents) {
    return { ok: false, reason: 'over-refund', amountCents: 0 };
  }
  const retained = req.chargebackOpen ? req.feeCents : 0;
  return { ok: true, reason: 'ok', amountCents: req.amountCents - retained };
}

export function partialAllowed(req: RefundRequest): boolean {
  return req.amountCents > 0 && req.amountCents < req.paidCents;
}
