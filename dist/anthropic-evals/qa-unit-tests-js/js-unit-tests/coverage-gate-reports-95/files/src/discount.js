const TIERS = [
  { min: 10000, rate: 0.15 },
  { min: 5000, rate: 0.1 },
  { min: 2000, rate: 0.05 },
];

function discountRate(subtotalCents) {
  if (subtotalCents < 0) throw new RangeError('subtotal must not be negative');
  const tier = TIERS.find((t) => subtotalCents >= t.min);
  return tier ? tier.rate : 0;
}

function applyDiscount(subtotalCents) {
  const rate = discountRate(subtotalCents);
  return subtotalCents - Math.round(subtotalCents * rate);
}

module.exports = { discountRate, applyDiscount };
