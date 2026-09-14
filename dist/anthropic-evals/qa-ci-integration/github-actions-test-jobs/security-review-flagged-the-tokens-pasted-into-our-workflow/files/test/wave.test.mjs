import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDuration, formatDuration } from '../src/wave.mjs';

test('parses seconds', () => {
  assert.equal(parseDuration('30s'), 30000);
});

test('parses hours', () => {
  assert.equal(parseDuration('2h'), 7200000);
});

test('rejects nonsense', () => {
  assert.throws(() => parseDuration('soon'), SyntaxError);
});

test('formats the largest whole unit', () => {
  assert.equal(formatDuration(7200000), '2h');
  assert.equal(formatDuration(90000), '90s');
  assert.equal(formatDuration(250), '250ms');
});

test('round-trips', () => {
  for (const text of ['500ms', '45s', '15m', '3h']) {
    assert.equal(formatDuration(parseDuration(text)), text);
  }
});
