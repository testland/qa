const test = require('node:test');
const assert = require('node:assert');
const { setLocale } = require('../src/i18n');
const { renderCheckout } = require('../src/checkout');

test('english fits every control', () => {
  setLocale('en');
  for (const cell of renderCheckout()) {
    assert.ok(!cell.text.endsWith('…'), cell.key + ' clipped in english');
  }
});

test('the generated locale fits every control', () => {
  setLocale('en-XA');
  const rows = renderCheckout();
  setLocale('en');
  for (const cell of rows) {
    assert.ok(!cell.text.endsWith('…'), cell.key + ' clipped under the generated locale');
  }
});
