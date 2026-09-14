export function money(minor, exponent) {
  return (minor / 10 ** exponent).toFixed(exponent);
}

export function receiptLine(label, amount, width = 40) {
  const pad = Math.max(0, width - label.length - amount.length);
  return (label + ' '.repeat(pad) + amount).slice(0, width);
}
