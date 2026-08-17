# Profile tests fail on the order of the results, never on the contents

## Problem Description

`test/profiles.test.js` fails about one run in six. Two failure shapes, both
from the same file:

```
Expected values to be strictly deep-equal:
+ actual - expected
  [
+   'u-2',
+   'u-1',
-   'u-1',
-   'u-2',
    'u-3',
    'u-4'
  ]

expected 'billing' to equal 'platform'
```

The right four profiles come back every time. Nothing is ever missing and
nothing is ever duplicated - two of them just trade places. The pairs that
trade are always neighbours in the list.

It is worse on the CI runner than on a laptop and worse when the box is
busy, but it happens everywhere. `src/profiles.js` is shipped code with a
documented behaviour, and the team that owns it has said the behaviour is not
changing.

## Output Specification

1. Fix `test/profiles.test.js` so all three tests pass on every run.
2. Keep the coverage each test has today: the first test must still verify
   that all four requested profiles come back, and the second must still
   verify that the profile for `u-2` is on the `platform` team. Do not modify
   `src/profiles.js`.
3. Write `ordering-diagnosis.md`: what the assertions were relying on, why it
   holds most of the time, and the rule for asserting on the output of this
   function in future tests.

Run `node --test` before you finish; it must pass.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "directory-service",
  "version": "2.9.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/profiles.js ===============
'use strict';

const DIRECTORY = {
  'u-1': { id: 'u-1', name: 'Ada', team: 'platform' },
  'u-2': { id: 'u-2', name: 'Grace', team: 'platform' },
  'u-3': { id: 'u-3', name: 'Katherine', team: 'billing' },
  'u-4': { id: 'u-4', name: 'Dorothy', team: 'billing' },
};

// Per-record lookup latency. A cold record costs an extra round trip.
const BASE_LATENCY = { 'u-1': 20, 'u-2': 55, 'u-3': 90, 'u-4': 125 };

function loadProfile(id) {
  const cold = Math.random() < 0.08;
  return new Promise((resolve) => {
    setTimeout(
      () => resolve({ ...DIRECTORY[id] }),
      BASE_LATENCY[id] + (cold ? 50 : 0)
    );
  });
}

// Looks the ids up concurrently. Results are collected as each lookup
// finishes; the returned list is not ordered by the ids that were requested.
async function loadProfiles(ids) {
  const found = [];
  await Promise.all(
    ids.map(async (id) => {
      found.push(await loadProfile(id));
    })
  );
  return found;
}

module.exports = { loadProfiles };

=============== FILE: test/profiles.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadProfiles } = require('../src/profiles');

test('every requested profile comes back', async () => {
  const profiles = await loadProfiles(['u-1', 'u-2', 'u-3', 'u-4']);

  assert.deepEqual(
    profiles.map((p) => p.id),
    ['u-1', 'u-2', 'u-3', 'u-4']
  );
});

test('a profile carries its team', async () => {
  const profiles = await loadProfiles(['u-2', 'u-3']);

  assert.equal(profiles[0].team, 'platform');
});

test('an empty request returns nothing', async () => {
  const profiles = await loadProfiles([]);

  assert.equal(profiles.length, 0);
});
