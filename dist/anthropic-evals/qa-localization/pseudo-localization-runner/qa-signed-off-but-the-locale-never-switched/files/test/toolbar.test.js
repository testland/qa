const test = require('node:test');
const assert = require('node:assert');
const { init, setLocale } = require('../src/i18n');
const { renderToolbar } = require('../src/toolbar');

test('the toolbar renders every control', () => {
  init();
  setLocale('en');
  assert.strictEqual(renderToolbar().length, 5);
});

test('english labels are not truncated', () => {
  init();
  setLocale('en');
  for (const cell of renderToolbar()) {
    assert.ok(!cell.text.endsWith('…'), cell.id + ' truncated');
  }
});
