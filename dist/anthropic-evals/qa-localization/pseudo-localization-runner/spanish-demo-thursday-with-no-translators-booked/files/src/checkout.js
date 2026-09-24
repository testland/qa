const { t } = require('./i18n');

// Character budgets per control, taken off the design frames.
const WIDTHS = {
  'checkout.payNow': 12,
  'checkout.addPaymentMethod': 20,
  'checkout.orderSummary': 16,
  'account.signOut': 14,
  'account.billingHistory': 18,
};

function fit(text, max) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

function renderCheckout() {
  return Object.keys(WIDTHS).map((key) => ({ key, text: fit(t(key), WIDTHS[key]) }));
}

module.exports = { renderCheckout, WIDTHS };
