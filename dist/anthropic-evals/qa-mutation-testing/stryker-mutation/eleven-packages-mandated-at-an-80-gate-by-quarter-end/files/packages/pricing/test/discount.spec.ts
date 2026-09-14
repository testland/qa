import { describe, it, expect } from 'vitest';
import { tierFor, discountedCents, prorate } from '../src/discount';

describe('tierFor', () => {
  it('returns a tier for a small account', () => {
    expect(tierFor(3)).toBeTruthy();
  });

  it('returns a tier for a large account', () => {
    expect(tierFor(500)).toBeTruthy();
  });

  it('returns something with a name', () => {
    expect(typeof tierFor(60).name).toBe('string');
  });
});

describe('discountedCents', () => {
  it('does not charge more than list', () => {
    expect(discountedCents(10000, 60)).toBeLessThanOrEqual(10000);
  });

  it('returns a number', () => {
    expect(typeof discountedCents(10000, 12)).toBe('number');
  });
});

describe('prorate', () => {
  it('is zero when nothing is left', () => {
    expect(prorate(10000, 0, 30)).toBe(0);
  });

  it('is positive mid-period', () => {
    expect(prorate(10000, 15, 30)).toBeGreaterThan(0);
  });
});
