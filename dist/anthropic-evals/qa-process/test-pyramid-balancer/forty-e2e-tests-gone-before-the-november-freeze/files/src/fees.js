export function feeSchedule(tier) {
  const bps = { standard: 290, volume: 175, partner: 90 }[tier];
  if (bps === undefined) throw new RangeError('unknown tier ' + tier);
  return bps;
}

export function feeCents(amountMinor, bps) {
  if (!Number.isInteger(amountMinor)) throw new TypeError('amountMinor must be an integer');
  return Math.round((amountMinor * bps) / 10000);
}
