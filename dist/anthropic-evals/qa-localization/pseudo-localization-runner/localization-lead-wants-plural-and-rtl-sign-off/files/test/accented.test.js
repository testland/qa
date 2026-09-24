const test = require('node:test');
const assert = require('node:assert');
const { setLocale } = require('../src/i18n');
const { renderCart } = require('../src/views');

const USER = { name: 'Ada', email: 'ada@example.com' };
const CART = { count: 3, total: '$41.00' };

test('the accented locale renders every row', () => {
  setLocale('en-XA');
  const rows = renderCart(USER, CART);
  setLocale('en');
  assert.strictEqual(rows.length, 5);
  for (const row of rows) {
    assert.ok(row.text.trim().length > 0, row.id + ' empty');
  }
});
