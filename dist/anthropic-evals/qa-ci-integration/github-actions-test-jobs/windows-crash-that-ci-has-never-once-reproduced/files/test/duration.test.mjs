import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDuration } from '../src/duration.mjs';

test('parses seconds', () => {
  assert.equal(parseDuration('30s'), 30000);
});

test('parses hours', () => {
  assert.equal(parseDuration('2h'), 7200000);
});

test('rejects nonsense', () => {
  assert.throws(() => parseDuration('soon'), SyntaxError);
});
