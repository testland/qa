function toCents(amount) {
  return Math.round(amount * 100);
}

function formatCents(cents, currency) {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

module.exports = { toCents, formatCents };
