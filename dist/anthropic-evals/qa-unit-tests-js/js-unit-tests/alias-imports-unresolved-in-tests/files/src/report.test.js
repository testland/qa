const { summarize } = require('./report');

test('totals the lines and adds VAT', () => {
  const out = summarize([{ amount: 100 }, { amount: 50 }]);

  expect(out.net).toBe('150.00 EUR');
  expect(out.vat).toBe('28.50 EUR');
  expect(out.gross).toBe('178.50 EUR');
});
