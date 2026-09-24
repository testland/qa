'use strict';

const THRESHOLD_GB = 100;
const ROAMING_OVER_THRESHOLD_EUR_PER_GB = 3;
const METERED_EUR_PER_MB = 0.02;

function round2(n) {
  return Math.round(n * 100) / 100;
}

function charge({ unlimited, usedGb, bundleGb = 0, roamingEu }) {
  if (roamingEu && usedGb > THRESHOLD_GB) {
    return { chargeEur: round2((usedGb - THRESHOLD_GB) * ROAMING_OVER_THRESHOLD_EUR_PER_GB) };
  }
  if (unlimited) return { chargeEur: 0 };
  const overBundleGb = Math.max(0, usedGb - bundleGb);
  return { chargeEur: round2(overBundleGb * 1024 * METERED_EUR_PER_MB) };
}

module.exports = { charge, THRESHOLD_GB };
