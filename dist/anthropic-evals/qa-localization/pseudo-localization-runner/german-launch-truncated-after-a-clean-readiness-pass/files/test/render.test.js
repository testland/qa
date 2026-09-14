const test = require('node:test');
const assert = require('node:assert');
const en = require('../locales/en.json');
const { renderAll } = require('../src/render');

test('english renders every surface', () => {
  assert.strictEqual(renderAll().length, Object.keys(en).length);
});

test('english is never clipped', () => {
  for (const cell of renderAll()) {
    assert.ok(!cell.text.endsWith('…'), cell.key + ' clipped in english');
  }
});
