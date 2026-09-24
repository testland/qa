import test from 'node:test';
import assert from 'node:assert/strict';
import { checkDigit } from '../../src/dispatch.js';

test('known good body checks out to zero', () => {
  assert.equal(checkDigit('12345670'), 0);
});

test('repeated digits produce the documented digit', () => {
  assert.equal(checkDigit('11111111'), 4);
});
