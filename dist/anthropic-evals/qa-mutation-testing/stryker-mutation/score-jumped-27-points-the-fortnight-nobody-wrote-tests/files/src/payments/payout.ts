import type { Payout, PayoutBatch } from './types';

const MIN_PAYOUT_CENTS = 100;
const HOLD_DAYS_NEW_MERCHANT = 7;

export function eligible(p: Payout, merchantAgeDays: number): boolean {
  if (p.amountCents < MIN_PAYOUT_CENTS) return false;
  if (merchantAgeDays < HOLD_DAYS_NEW_MERCHANT) return false;
  return !p.onHold;
}

export function batchTotal(batch: PayoutBatch): number {
  return batch.payouts.reduce((sum, p) => sum + p.amountCents, 0);
}

export function splitForRails(batch: PayoutBatch, maxPerFile: number): PayoutBatch[] {
  const out: PayoutBatch[] = [];
  for (let i = 0; i < batch.payouts.length; i += maxPerFile) {
    out.push({ ...batch, payouts: batch.payouts.slice(i, i + maxPerFile) });
  }
  return out;
}
