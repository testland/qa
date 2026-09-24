export function formatMinorUnits(minor, currency = 'EUR', locale = 'en-IE') {
  if (!Number.isInteger(minor)) throw new TypeError('minor units must be an integer');
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(minor / 100);
}

export function sumMinorUnits(values) {
  return values.reduce((total, v) => {
    if (!Number.isInteger(v)) throw new TypeError('minor units must be an integer');
    return total + v;
  }, 0);
}
