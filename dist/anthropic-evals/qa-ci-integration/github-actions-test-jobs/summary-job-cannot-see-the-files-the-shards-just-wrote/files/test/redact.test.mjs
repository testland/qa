import test from 'node:test';
import assert from 'node:assert/strict';
import { redact } from '../src/audit.mjs';

test('redacts the named fields', () => {
  assert.deepEqual(redact({ a: 1, ssn: '123' }, ['ssn']), { a: 1, ssn: '[redacted]' });
});

test('leaves absent fields alone', () => {
  assert.deepEqual(redact({ a: 1 }, ['ssn']), { a: 1 });
});
