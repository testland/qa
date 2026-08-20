const SYMBOLS = { EUR: '€', USD: '$' };

function money(cents, code) {
  return `${SYMBOLS[code]}${(cents / 100).toFixed(2)}`;
}

function formatInvoice(invoice) {
  const net = invoice.lines.reduce((sum, l) => sum + l.unitCents * l.qty, 0);
  const tax = Math.round(net * invoice.taxRate);
  const rendered = invoice.lines.map(
    (l) => `${l.description} x${l.qty} ${money(l.unitCents * l.qty, invoice.currency)}`,
  );

  return [
    `INVOICE ${invoice.reference}`,
    ...rendered,
    `Net ${money(net, invoice.currency)}`,
    `Tax ${money(tax, invoice.currency)}`,
    `Total ${money(net + tax, invoice.currency)}`,
  ].join('\n');
}

module.exports = { formatInvoice };
