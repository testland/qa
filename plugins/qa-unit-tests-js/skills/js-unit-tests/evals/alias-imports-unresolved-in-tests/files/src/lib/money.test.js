const { toCents, formatCents } = require('./money');

test('converts an amount to whole cents', () => {
  expect(toCents(12.34)).toBe(1234);
});

test('formats cents with the currency code', () => {
  expect(formatCents(2000, 'EUR')).toBe('20.00 EUR');
});
