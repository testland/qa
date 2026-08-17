const { formatInvoice } = require('./format-invoice');

const base = {
  reference: 'INV-1001',
  currency: 'EUR',
  taxRate: 0.19,
  lines: [{ description: 'Widget', qty: 2, unitCents: 1250 }],
};

test('renders a single-line invoice', () => {
  expect(formatInvoice(base)).toMatchSnapshot();
});

test('renders several lines', () => {
  const invoice = {
    ...base,
    lines: [...base.lines, { description: 'Gizmo', qty: 1, unitCents: 999 }],
  };

  expect(formatInvoice(invoice)).toMatchSnapshot();
});

test('renders a zero-tax invoice in dollars', () => {
  expect(formatInvoice({ ...base, currency: 'USD', taxRate: 0 })).toMatchSnapshot();
});
