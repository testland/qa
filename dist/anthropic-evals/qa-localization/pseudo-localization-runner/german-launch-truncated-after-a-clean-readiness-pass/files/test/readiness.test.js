const test = require('node:test');
const assert = require('node:assert');
const en = require('../locales/en.json');
const { pseudoLocalize } = require('../src/pseudo');
const { measurable, overflows } = require('../src/layout');

test('every string still fits its surface under the accented locale', () => {
  for (const key of Object.keys(en)) {
    const text = pseudoLocalize(en[key]);
    assert.ok(!overflows(measurable(text), key), key + ' overflows its surface: ' + text);
  }
});
