import test from 'node:test';
import assert from 'node:assert/strict';
import { redact } from '../src/audit.mjs';

test('does not mutate the input', () => {
  const input = { ssn: '123' };
  redact(input, ['ssn']);
  assert.equal(input.ssn, '123');
});

test('returns a distinct object', () => {
  const input = { ssn: '123' };
  assert.notEqual(redact(input, ['ssn']), input);
});
