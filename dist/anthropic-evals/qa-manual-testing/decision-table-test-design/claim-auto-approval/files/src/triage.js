'use strict';

const AUTO_LIMIT_EUR = 1000;
const ESTABLISHED_MONTHS = 6;

function triage(claim) {
  const { amountEur, policyMonths, photoAttached, garageEstimateAttached } = claim;
  const serviceLevelDays = garageEstimateAttached ? 2 : 5;

  if (policyMonths < ESTABLISHED_MONTHS) {
    return { queue: 'fraud-review', serviceLevelDays };
  }
  if (amountEur > AUTO_LIMIT_EUR) {
    return { queue: 'adjuster', serviceLevelDays };
  }
  if (photoAttached) {
    return { queue: 'auto-approved', serviceLevelDays: 0 };
  }
  return { queue: 'held-for-photo', serviceLevelDays: 0 };
}

module.exports = { triage, AUTO_LIMIT_EUR, ESTABLISHED_MONTHS };
