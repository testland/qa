const { toCents, formatCents } = require('@lib/money');
const defaults = require('@config/defaults');

function summarize(lines) {
  const netCents = lines.reduce((sum, line) => sum + toCents(line.amount), 0);
  const vatCents = Math.round(netCents * defaults.vatRate);

  return {
    net: formatCents(netCents, defaults.currency),
    vat: formatCents(vatCents, defaults.currency),
    gross: formatCents(netCents + vatCents, defaults.currency),
  };
}

module.exports = { summarize };
