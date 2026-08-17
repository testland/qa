const { lineTotal, subtotal } = require('./pricing');

test('multiplies unit price by quantity', () => {
  expect(lineTotal(250, 4)).toBe(1000);
});

test('sums the lines', () => {
  expect(subtotal([{ unitPriceCents: 250, qty: 4 }, { unitPriceCents: 100, qty: 1 }])).toBe(1100);
});

test('rejects a fractional quantity', () => {
  expect(() => lineTotal(250, 1.5)).toThrow(RangeError);
});
