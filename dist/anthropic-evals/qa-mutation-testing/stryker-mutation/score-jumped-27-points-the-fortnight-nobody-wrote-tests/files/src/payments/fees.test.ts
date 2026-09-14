import { describe, it, expect } from 'vitest';
import { feeFor, isHighRisk, surchargeFor, rateFor } from './fees';

describe('fees', () => {
  it('charges a fee on a normal payment', () => {
    expect(feeFor(5000, 'GB', 'standard')).toBeTruthy();
  });

  it('returns a number for every tier', () => {
    for (const tier of ['standard', 'plus', 'enterprise']) {
      expect(typeof feeFor(5000, 'GB', tier)).toBe('number');
    }
  });

  it('looks up a rate', () => {
    expect(rateFor('GB', 'standard')).toBeGreaterThan(0);
  });

  it('flags a risky payment', () => {
    expect(isHighRisk(95)).toBe(true);
  });

  it('does not surcharge a safe payment', () => {
    expect(surchargeFor(5000, 10)).toBe(0);
  });
});
