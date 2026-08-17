'use strict';

const PLANS = {
  team: { name: 'Team', perSeatCents: 1000, seatCap: 25 },
  enterprise: { name: 'Enterprise', perSeatCents: 2500, seatCap: 500 },
};

function planPrice(plan, seats) {
  const definition = PLANS[plan];
  if (!definition) {
    throw new Error(`Unknown plan: ${plan}`);
  }
  if (seats > definition.seatCap) {
    throw new Error(`Seat cap exceeded for ${plan}`);
  }
  return definition.perSeatCents * seats;
}

function prorate(amountCents, daysRemaining, daysInPeriod) {
  if (daysRemaining <= 0) {
    return 0;
  }
  return Math.round((amountCents * daysRemaining) / daysInPeriod);
}

function describePlan(plan) {
  const definition = PLANS[plan];
  if (!definition) {
    throw new Error(`Unknown plan: ${plan}`);
  }
  return { name: definition.name, seatCap: definition.seatCap };
}

module.exports = { planPrice, prorate, describePlan };
