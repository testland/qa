const { renderReceipt } = require('./receipt-widget');

test('renders the reference and the total', () => {
  const el = renderReceipt({ reference: 'INV-9', total: '24.00' });

  expect(el.querySelector('h2').textContent).toBe('INV-9');
  expect(el.querySelector('.total').textContent).toBe('24.00');
});
