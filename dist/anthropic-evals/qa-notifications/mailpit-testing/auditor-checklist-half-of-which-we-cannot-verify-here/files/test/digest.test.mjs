import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDigest } from '../src/templates/digest.mjs';

const user = { id: 'u1', email: 'alice@example.com', unsubToken: 'tok-alice-9931' };
const items = [
  { title: 'Two new comments', url: 'https://app.example.com/t/1', count: 2 },
  { title: 'Build passed', url: 'https://app.example.com/t/2', count: 1 },
];

test('digest subject counts the items', () => {
  const msg = buildDigest(user, items);
  assert.equal(msg.subject, 'Your weekly Harbour digest — 2 updates');
});

test('digest is addressed to the recipient', () => {
  const msg = buildDigest(user, items);
  assert.equal(msg.to, 'alice@example.com');
  assert.equal(msg.from, 'digest@example.com');
});
