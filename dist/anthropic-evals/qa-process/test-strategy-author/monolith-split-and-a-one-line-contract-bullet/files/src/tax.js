export function taxCents(amountCents, ratePermille) {
  if (!Number.isInteger(amountCents) || amountCents < 0) throw new Error('bad amount');
  if (!Number.isInteger(ratePermille) || ratePermille < 0) throw new Error('bad rate');
  return Math.round((amountCents * ratePermille) / 1000);
}
