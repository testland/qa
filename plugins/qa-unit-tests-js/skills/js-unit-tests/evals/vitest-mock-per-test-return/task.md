# user-service has no tests

## Problem Description

`src/user-service.js` wraps `src/api-client.js`. It returns the fetched user,
maps a 404 into `null`, and lets any other failure propagate.

We need it covered without touching the network. The three cases each need the
API layer to behave differently, so the double has to be steerable per test -
one test wants a user back, one wants a not-found error, one wants a timeout.

`src/api-client.js` itself is not under test here; it is exercised elsewhere.

## Output Specification

Add `src/user-service.test.js` covering:

1. A found user is returned as-is.
2. A 404 from the API layer results in `null`, not a thrown error.
3. Any other API failure propagates to the caller.

The suite must pass with the project's existing test command, and must not
reach the network or add new dependencies.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "account-service",
  "version": "2.3.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^2.1.8"
  }
}

=============== FILE: src/api-client.js ===============
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function fetchUser(id) {
  const res = await fetch(`https://api.example.com/users/${id}`);
  if (!res.ok) throw new ApiError(res.status, `request failed: ${res.status}`);
  return res.json();
}

=============== FILE: src/user-service.js ===============
import { fetchUser } from './api-client.js';

export async function getUser(id) {
  try {
    return await fetchUser(id);
  } catch (err) {
    if (err.name === 'ApiError' && err.status === 404) return null;
    throw err;
  }
}

=============== FILE: src/format.test.js ===============
import { expect, test } from 'vitest';

function initials(name) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('');
}

test('builds initials from a full name', () => {
  expect(initials('Ada Lovelace')).toBe('AL');
});
