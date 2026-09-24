import test from 'node:test';
import assert from 'node:assert/strict';
import { signWebhook } from '../../src/dispatch.js';

test('signature is stable for the same payload and secret', () => {
  assert.equal(signWebhook('{"id":1}', 'shhh'), signWebhook('{"id":1}', 'shhh'));
});

test('a different secret produces a different signature', () => {
  assert.notEqual(signWebhook('{"id":1}', 'shhh'), signWebhook('{"id":1}', 'other'));
});
