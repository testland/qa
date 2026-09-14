// Character budgets per surface, taken off the 1440px design frames.
const BUDGETS = {
  'billing.confirm': 28,
  'billing.cancel': 12,
  'billing.plan': 18,
  'invoice.download': 22,
  'invoice.export': 24,
  'nav.settings': 14,
  'nav.billing': 14,
};

function overflows(text, key) {
  const budget = BUDGETS[key];
  if (budget === undefined) return false; // surfaces with no measured frame are not gated
  return text.length > budget;
}

module.exports = { BUDGETS, overflows };
