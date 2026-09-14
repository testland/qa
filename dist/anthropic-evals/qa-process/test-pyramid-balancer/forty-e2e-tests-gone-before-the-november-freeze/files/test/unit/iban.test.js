import test from 'node:test';
import assert from 'node:assert/strict';
import { ibanFormatOk } from '../../src/iban.js';

test('a well formed iban passes the format check', () => {
  assert.equal(ibanFormatOk('GB29NWBK60161331926819'), true);
});

test('a lowercase country code fails the format check', () => {
  assert.equal(ibanFormatOk('gb29NWBK60161331926819'), false);
});

test('a short iban fails the format check', () => {
  assert.equal(ibanFormatOk('GB29NWBK'), false);
});

test('a non alphanumeric character fails the format check', () => {
  assert.equal(ibanFormatOk('GB29-NWBK-6016-1331-9268-19'), false);
});
