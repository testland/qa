const TIERS = [
  { maxSeats: 10, perSeatCents: 1500 },
  { maxSeats: 50, perSeatCents: 1200 },
  { maxSeats: Infinity, perSeatCents: 900 },
];

const MIN_SEATS = 3;
const ANNUAL_DISCOUNT = 0.15;

export function priceFor(seats, { annual = false } = {}) {
  if (!Number.isInteger(seats) || seats < 1) {
    throw new RangeError('seats must be a positive integer');
  }

  const billable = Math.max(seats, MIN_SEATS);
  const tier = TIERS.find((t) => billable <= t.maxSeats);
  const monthly = billable * tier.perSeatCents;

  if (!annual) return monthly;

  const yearly = monthly * 12;
  return yearly - Math.round(yearly * ANNUAL_DISCOUNT);
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe('priceFor', () => {
    it('bills the seat floor below it', () => {
      expect(priceFor(1)).toBe(4500);
    });

    it('bills the first tier at its top edge', () => {
      expect(priceFor(10)).toBe(15000);
    });

    it('moves to the second tier one seat later', () => {
      expect(priceFor(11)).toBe(13200);
    });

    it('bills the second tier at its top edge', () => {
      expect(priceFor(50)).toBe(60000);
    });

    it('moves to the third tier one seat later', () => {
      expect(priceFor(51)).toBe(45900);
    });

    it('discounts an annual plan', () => {
      expect(priceFor(4, { annual: true })).toBe(61200);
    });

    it('rejects a seat count below one', () => {
      expect(() => priceFor(0)).toThrow(RangeError);
    });
  });
}
