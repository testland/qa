const RATES = { standard: 0.2, reduced: 0.05, zero: 0 };

function taxFor(amountCents, band) {
  if (!(band in RATES)) throw new TypeError(`unknown tax band: ${band}`);
  if (amountCents < 0) throw new RangeError('amount must not be negative');
  return Math.round(amountCents * RATES[band]);
}

module.exports = { taxFor, RATES };
