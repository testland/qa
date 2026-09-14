const test = require('node:test');
const assert = require('node:assert');
const en = require('../locales/en.json');
const { pseudoLocalize } = require('../src/pseudo');
const { init, setLocale } = require('../src/i18n');
const { renderToolbar } = require('../src/toolbar');

// l10n smoke, added 2026-07-16.

test('every label survives the transform', () => {
  for (const key of Object.keys(en)) {
    const out = pseudoLocalize(en[key]);
    assert.notStrictEqual(out, en[key]);
    assert.match(out, /[À-ɏ]/, key + ' came back without extended characters');
  }
});

test('the toolbar does not truncate under the accented locale', () => {
  init();
  setLocale('en-XA');
  for (const cell of renderToolbar()) {
    assert.ok(!cell.text.endsWith('…'), cell.id + ' truncated under the accented locale');
  }
  setLocale('en');
});
