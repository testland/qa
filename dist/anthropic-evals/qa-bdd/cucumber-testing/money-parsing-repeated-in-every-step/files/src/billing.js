const PLANS = {
  Free: { name: 'Free', monthly: 0 },
  Team: { name: 'Team', monthly: 4900 },
  Enterprise: { name: 'Enterprise', monthly: 19900 },
};

function planNamed(name) {
  const plan = PLANS[name];
  if (!plan) throw new Error(`Unknown plan: ${name}`);
  return plan;
}

function prorate(from, to, daysRemaining, daysInCycle) {
  return Math.round(((to.monthly - from.monthly) * daysRemaining) / daysInCycle);
}

module.exports = { PLANS, planNamed, prorate };
