const test = require('node:test');
const assert = require('node:assert');
const en = require('../locales/en.json');
const { BUNDLES, SUPPORTED_LOCALES } = require('../src/locales');

test('every offered locale has a bundle', () => {
  for (const code of SUPPORTED_LOCALES) {
    assert.ok(BUNDLES[code], code + ' has no bundle');
  }
});

test('every bundle covers every english key', () => {
  for (const code of Object.keys(BUNDLES)) {
    for (const key of Object.keys(en)) {
      assert.ok(BUNDLES[code][key], code + ' is missing ' + key);
    }
  }
});

test('the picker offers spanish', () => {
  assert.ok(SUPPORTED_LOCALES.includes('es-ES'));
});

test('the generated bundle is not plain english', () => {
  for (const key of Object.keys(en)) {
    assert.notStrictEqual(BUNDLES['en-XA'][key], en[key], key + ' came back untransformed');
  }
});
