# Two of our green tests do not actually check anything

## Problem Description

We shipped a build where `notifyOwner` no longer rejected for a token with no
owner - the guard clause had been deleted in a merge - and the suite stayed
green. We reproduced it deliberately afterwards: delete the guard, run the
suite, three passing tests. The owner-check test passes whether the function
rejects or not.

Separately, the token file is not safe to extend. The first test in it stands in
a fixed clock and a fixed random source so it can assert exact values, and
whatever it stands in stays standing for everything after it in that file. Two
people have now written a follow-up test, watched it fail for reasons that had
nothing to do with the code, and moved it to the top of the file to make it
pass.

`src/token.js` and `src/notify.js` are correct. The tests are the problem.

## Output Specification

1. Rework the owner-check test in `src/notify.test.js` so that it fails if
   `notifyOwner` stops rejecting for a token with no owner, while still
   covering exactly that behaviour.
2. Add to `src/token.test.js`:
   - a test that two tokens created one after another have different ids;
   - a test that a token whose expiry has passed reports as expired and one
     whose expiry has not does not, at an explicit point in time.
3. Every test must pass on its own AND in file order, wherever in the file it is
   placed. Moving a new test above an existing one to avoid interference is not
   an answer.
4. Keep the existing assertions - the fixed-clock test must still assert the
   exact issue time and expiry it asserts today.
5. Do not change `src/token.js` or `src/notify.js`, and do not add packages to
   `package.json`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "session-tokens",
  "version": "2.0.3",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^2.1.8"
  }
}

=============== FILE: src/token.js ===============
const TTL_MS = 30 * 60 * 1000;

export function createToken(userId) {
  const issuedAt = Date.now();

  return {
    id: Math.random().toString(36).slice(2, 10),
    userId,
    issuedAt,
    expiresAt: issuedAt + TTL_MS,
  };
}

export function isExpired(token, now = Date.now()) {
  return now >= token.expiresAt;
}

=============== FILE: src/notify.js ===============
export async function notifyOwner(token, send) {
  if (!token || !token.userId) throw new Error('token has no owner');

  const receipt = await send(token.userId, `session ${token.id}`);
  return { delivered: true, receipt };
}

=============== FILE: src/token.test.js ===============
import { expect, test, vi } from 'vitest';
import { createToken, isExpired } from './token.js';

const FIXED_NOW = 1_700_000_000_000;

test('stamps the issue time and a thirty minute expiry', () => {
  vi.spyOn(Date, 'now').mockReturnValue(FIXED_NOW);
  vi.spyOn(Math, 'random').mockReturnValue(0.123456789);

  const token = createToken('u-1');

  expect(token.userId).toBe('u-1');
  expect(token.issuedAt).toBe(FIXED_NOW);
  expect(token.expiresAt).toBe(FIXED_NOW + 1_800_000);
});

=============== FILE: src/notify.test.js ===============
import { expect, test, vi } from 'vitest';
import { notifyOwner } from './notify.js';

test('sends a notice to the owner', async () => {
  const send = vi.fn().mockResolvedValue('receipt-1');

  await expect(notifyOwner({ id: 'a1', userId: 'u-1' }, send)).resolves.toEqual({
    delivered: true,
    receipt: 'receipt-1',
  });
  expect(send).toHaveBeenCalledWith('u-1', 'session a1');
});

test('refuses a token with no owner', async () => {
  notifyOwner({ id: 'a1' }, vi.fn()).catch((error) => {
    expect(error.message).toBe('token has no owner');
  });
});
