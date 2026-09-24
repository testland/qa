function diffRatio(a, b) {
  if (a.length !== b.length) throw new RangeError('images differ in size');
  let changed = 0;
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > 8) changed++;
  }
  return changed / a.length;
}

function isRegression(a, b, threshold = 0.01) {
  return diffRatio(a, b) > threshold;
}

module.exports = { diffRatio, isRegression };
