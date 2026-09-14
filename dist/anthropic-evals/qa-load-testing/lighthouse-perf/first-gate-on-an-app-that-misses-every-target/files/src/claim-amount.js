const CAPS = { standard: 250000, enhanced: 1000000 };

export function excessFor(tier) {
  if (!(tier in CAPS)) throw new Error('unknown tier: ' + tier);
  return tier === 'enhanced' ? 5000 : 15000;
}

export function payable(claimedPence, tier) {
  if (!Number.isInteger(claimedPence) || claimedPence < 0) {
    throw new RangeError('claim must be a non-negative integer of pence');
  }
  const net = claimedPence - excessFor(tier);
  if (net <= 0) return 0;
  return Math.min(net, CAPS[tier]);
}
