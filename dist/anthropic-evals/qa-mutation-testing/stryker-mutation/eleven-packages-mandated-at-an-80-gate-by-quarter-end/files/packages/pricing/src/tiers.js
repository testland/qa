const TIERS = [
  { name: 'free', upTo: 1000, unitCents: 0 },
  { name: 'growth', upTo: 50000, unitCents: 4 },
  { name: 'scale', upTo: Infinity, unitCents: 3 },
];

export function tierFor(units) {
  if (units < 0) throw new RangeError('units must not be negative');
  return TIERS.find((t) => units <= t.upTo);
}

export function chargeCents(units) {
  const tier = tierFor(units);
  return units * tier.unitCents;
}
