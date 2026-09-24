const test = require('node:test');
const assert = require('node:assert');
const { setLocale, currentLocale } = require('../src/i18n');
const { renderToolbar } = require('../src/toolbar');

// l10n smoke, added 2026-07-16.

test('the accented locale is selected before the walk', () => {
  assert.strictEqual(setLocale('en-XA'), true);
  assert.strictEqual(currentLocale(), 'en-XA');
  setLocale('en');
});

test('the toolbar does not truncate under the accented locale', () => {
  setLocale('en-XA');
  for (const cell of renderToolbar()) {
    assert.ok(!cell.text.endsWith('…'), cell.id + ' truncated under the accented locale');
  }
  setLocale('en');
});
