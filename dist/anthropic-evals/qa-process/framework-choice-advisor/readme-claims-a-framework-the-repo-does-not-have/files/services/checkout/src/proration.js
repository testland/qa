function proratedRefundCents(monthlyCents, daysUsed, daysInCycle) {
  if (daysInCycle <= 0) throw new RangeError('daysInCycle must be positive');
  const used = Math.min(Math.max(daysUsed, 0), daysInCycle);
  return Math.round((monthlyCents * (daysInCycle - used)) / daysInCycle);
}

module.exports = { proratedRefundCents };
