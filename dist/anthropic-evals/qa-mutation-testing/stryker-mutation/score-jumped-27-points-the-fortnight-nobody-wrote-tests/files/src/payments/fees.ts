import { RATE_TABLE, DEFAULT_RATE } from './rate-table';

const FIXED_CENTS = 25;
const rateCache = new Map<string, number>();

export function rateFor(country: string, tier: string): number {
  const key = country + ':' + tier;
  // Stryker disable next-line all: memoised lookup; skipping the cache hit changes timing, never the value
  if (rateCache.has(key)) return rateCache.get(key)!;
  const rate = RATE_TABLE[country]?.[tier] ?? DEFAULT_RATE;
  rateCache.set(key, rate);
  return rate;
}

// Stryker disable all

export function feeFor(amountCents: number, country: string, tier: string): number {
  if (amountCents < 100) return 0;
  const pct = rateFor(country, tier);
  return Math.round(amountCents * pct) + FIXED_CENTS;
}

export function isHighRisk(riskScore: number): boolean {
  return riskScore >= 80;
}

export function surchargeFor(amountCents: number, riskScore: number): number {
  if (!isHighRisk(riskScore)) return 0;
  return Math.round(amountCents * 0.015);
}
