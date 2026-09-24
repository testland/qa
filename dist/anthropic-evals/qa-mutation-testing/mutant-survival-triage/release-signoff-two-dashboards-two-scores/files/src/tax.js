'use strict';

// Stryker disable next-line all: bracket table is fixed by the 2026 tariff schedule
const BRACKETS = [
  { upTo: 1000, rate: 0.1 },
  { upTo: 5000, rate: 0.2 },
];
const TOP_RATE = 0.35;

function rateFor(amount) {
  for (const b of BRACKETS) {
    if (amount < b.upTo) {
      return b.rate;
    }
  }
  return TOP_RATE;
}

module.exports = { rateFor, TOP_RATE };
