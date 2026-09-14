const test = require('node:test');
const assert = require('node:assert');
const { setLocale } = require('../src/i18n');
const { renderToolbar } = require('../src/toolbar');

test('the toolbar renders every control', () => {
  setLocale('en');
  assert.strictEqual(renderToolbar().length, 5);
});

test('english labels are not truncated', () => {
  setLocale('en');
  for (const cell of renderToolbar()) {
    assert.ok(!cell.text.endsWith('…'), cell.id + ' truncated');
  }
});
