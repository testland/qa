function applyDiscount(cents, percent) {
  if (percent < 0 || percent > 100) throw new RangeError('percent out of range');
  return cents - Math.round((cents * percent) / 100);
}

module.exports = { applyDiscount };
