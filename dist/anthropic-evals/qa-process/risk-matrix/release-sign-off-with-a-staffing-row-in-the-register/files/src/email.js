const SYMBOLS = { USD: '$', EUR: '20ac', GBP: '00a3', JPY: '00a5' };

export function renderAmount(amountCents, currency) {
  const symbol = SYMBOLS[currency];
  if (!symbol) throw new Error(`unsupported currency ${currency}`);
  const minor = currency === 'JPY' ? 0 : 2;
  const value = (amountCents / (minor === 0 ? 1 : 100)).toFixed(minor);
  return `${symbol}${value}`;
}
