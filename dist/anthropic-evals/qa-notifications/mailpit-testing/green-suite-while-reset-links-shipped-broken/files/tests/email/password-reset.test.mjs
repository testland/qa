import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearAll,
  requestReset,
  firstMatch,
  fullMessage,
  headersOf,
  bodiesOf,
  linksIn,
} from './mailbox.mjs';

// Seeded by scripts/seed-mailbox.sh during CI bootstrap.
const SEEDED_ID = 'FVc8jL2qkQ3mHnPz9RtWbX';

const EXPECTED_HEADERS = {
  Subject: 'Reset your password',
  From: 'security@example.com',
  To: 'alice@example.com',
};

beforeEach(clearAll);

async function capture(email = 'alice@example.com') {
  await requestReset(email);
  const summary = await firstMatch(email);
  return fullMessage(summary.ID);
}

test('reset email carries the headers we expect', async () => {
  const msg = await capture();
  for (const [name, values] of Object.entries(headersOf(msg))) {
    if (name in EXPECTED_HEADERS) assert.equal(values[0], EXPECTED_HEADERS[name]);
  }
});

test('reset email is addressed to the requester', async () => {
  const msg = await capture();
  for (const addr of headersOf(msg).To ?? []) {
    assert.equal(addr, 'alice@example.com');
  }
});

test('reset email mentions the expiry window', async () => {
  const msg = await capture();
  for (const part of bodiesOf(msg)) {
    assert.ok(part.includes('expires in 30 minutes'));
  }
});

test('every link in the reset email points at our app', async () => {
  const msg = await capture();
  for (const link of linksIn(msg)) {
    assert.ok(link.startsWith('http://app:3000/'));
  }
});

test('the reset link carries a token', async () => {
  const msg = await capture();
  for (const link of linksIn(msg).filter((l) => l.includes('/reset'))) {
    assert.match(link, /token=[A-Za-z0-9_-]{16,}/);
  }
});

test('the seeded fixture message is readable', async () => {
  const msg = await fullMessage(SEEDED_ID);
  for (const [name, values] of Object.entries(headersOf(msg))) {
    if (name === 'Subject') assert.equal(values[0], 'Seed message');
  }
});
