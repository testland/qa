const TIERS = [
  { min: 0, pct: 0 },
  { min: 5000, pct: 5 },
  { min: 20000, pct: 10 },
  { min: 100000, pct: 15 },
];

export function tierFor(subtotalPence) {
  if (!Number.isInteger(subtotalPence) || subtotalPence < 0) {
    throw new RangeError('subtotal must be a non-negative integer of pence');
  }
  return TIERS.filter((t) => subtotalPence >= t.min).at(-1);
}

export function discounted(subtotalPence) {
  const { pct } = tierFor(subtotalPence);
  return subtotalPence - Math.round((subtotalPence * pct) / 100);
}
