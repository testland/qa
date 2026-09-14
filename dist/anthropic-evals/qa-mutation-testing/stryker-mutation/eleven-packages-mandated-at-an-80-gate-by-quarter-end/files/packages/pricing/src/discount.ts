export interface Tier {
  name: string;
  minSeats: number;
  pctOff: number;
}

export const TIERS: Tier[] = [
  { name: 'starter', minSeats: 1, pctOff: 0 },
  { name: 'team', minSeats: 10, pctOff: 10 },
  { name: 'business', minSeats: 50, pctOff: 20 },
  { name: 'enterprise', minSeats: 250, pctOff: 30 },
];

export function tierFor(seats: number): Tier {
  let chosen = TIERS[0];
  for (const t of TIERS) {
    if (seats >= t.minSeats) chosen = t;
  }
  return chosen;
}

export function discountedCents(listCents: number, seats: number): number {
  const tier = tierFor(seats);
  const off = Math.round((listCents * tier.pctOff) / 100);
  return listCents - off;
}

export function prorate(listCents: number, daysLeft: number, daysInPeriod: number): number {
  if (daysLeft <= 0) return 0;
  if (daysLeft >= daysInPeriod) return listCents;
  return Math.round((listCents * daysLeft) / daysInPeriod);
}
