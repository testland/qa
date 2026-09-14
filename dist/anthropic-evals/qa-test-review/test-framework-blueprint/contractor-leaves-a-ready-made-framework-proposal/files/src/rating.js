'use strict';

const ZONE_MULTIPLIER = { A: 1.0, B: 1.25, C: 1.6 };

function bandFor(weightKg) {
  if (weightKg <= 1) return 800;
  if (weightKg <= 5) return 1480;
  if (weightKg <= 20) return 2600;
  return 2600 + Math.ceil(weightKg - 20) * 90;
}

function quoteFor({ weightKg, zone }) {
  const multiplier = ZONE_MULTIPLIER[zone];
  if (!multiplier) throw new Error(`unknown zone: ${zone}`);
  return Math.round(bandFor(weightKg) * multiplier);
}

module.exports = { quoteFor, bandFor };
