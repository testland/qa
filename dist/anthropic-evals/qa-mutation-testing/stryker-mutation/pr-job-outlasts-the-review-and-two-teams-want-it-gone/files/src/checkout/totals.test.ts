import { lineTotal, orderTotal } from './totals';

describe('lineTotal', () => {
  it('applies tax to the net line value', () => {
    expect(lineTotal({ unitCents: 1000, qty: 2, taxRate: 0.2 })).toBe(2400);
  });

  it('is zero for a zero quantity', () => {
    expect(lineTotal({ unitCents: 1000, qty: 0, taxRate: 0.2 })).toBe(0);
  });
});

describe('orderTotal', () => {
  it('charges shipping below the free threshold', () => {
    const lines = [{ unitCents: 1000, qty: 1, taxRate: 0 }];
    expect(orderTotal(lines, 499)).toBe(1499);
  });

  it('ships free at the threshold', () => {
    const lines = [{ unitCents: 5000, qty: 1, taxRate: 0 }];
    expect(orderTotal(lines, 499)).toBe(5000);
  });
});
