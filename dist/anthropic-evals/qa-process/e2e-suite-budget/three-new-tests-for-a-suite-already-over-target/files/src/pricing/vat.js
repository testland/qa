'use strict';

const RATES = { GB: 0.20, NO: 0.25, DK: 0.25, PL: 0.23, DE: 0.19 };
const ROUNDING = { GB: 'half-up', NO: 'half-even', DK: 'half-even', PL: 'half-up', DE: 'half-up' };

function round(value, mode) {
  if (mode === 'half-even') {
    const floor = Math.floor(value);
    const diff = value - floor;
    if (diff !== 0.5) return Math.round(value);
    return floor % 2 === 0 ? floor : floor + 1;
  }
  return Math.floor(value + 0.5);
}

function taxLineMinor(country, netMinor) {
  const rate = RATES[country];
  if (rate === undefined) throw new Error(`no rate for ${country}`);
  return round(netMinor * rate, ROUNDING[country]);
}

module.exports = { taxLineMinor, RATES, ROUNDING };
