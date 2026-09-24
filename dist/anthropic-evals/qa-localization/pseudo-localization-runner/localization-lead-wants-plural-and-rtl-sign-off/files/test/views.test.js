const test = require('node:test');
const assert = require('node:assert');
const { setLocale } = require('../src/i18n');
const { renderCart } = require('../src/views');

const USER = { name: 'Ada', email: 'ada@example.com' };
const CART = { count: 3, total: '$41.00' };

test('the cart renders every row in english', () => {
  setLocale('en');
  assert.strictEqual(renderCart(USER, CART).length, 5);
});

test('english rows are not clipped', () => {
  setLocale('en');
  for (const row of renderCart(USER, CART)) {
    assert.ok(!row.text.endsWith('…'), row.id + ' clipped in english');
  }
});

test('english interpolates the values it is given', () => {
  setLocale('en');
  const rows = renderCart(USER, CART);
  assert.match(rows[0].text, /Ada/);
  assert.match(rows[1].text, /\$41\.00/);
});
