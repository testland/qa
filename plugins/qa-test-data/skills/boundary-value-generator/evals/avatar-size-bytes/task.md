# Nobody can say what the avatar size limit actually is

## Problem Description

`src/avatar.js` validates the size of an uploaded avatar. The help centre says
"up to 5 MB" and the module works in bytes.

Two tickets landed the same week. One user uploaded a file their operating
system displayed as 5.2 MB and it went through. Another uploaded a file
displayed as exactly 5 MB and got it back rejected. Both users quoted the
help-centre number at us and neither of us could say who was right, because
the tests never go near either limit.

The module also has a floor, meant to catch truncated uploads, and that has
never been exercised either. The single existing test uses a mid-sized file.

## Output Specification

1. Add `src/avatar.test.js` giving both size limits systematic edge coverage,
   expressed in the unit the module actually compares in.
2. Include a representative accepted, undersized, and oversized file that is
   nowhere near a limit, so a reader can see the ordinary behaviour of each
   outcome separately from the edges.
3. Every rejecting case asserts the specific code, not merely that the call
   failed.
4. Run `npm test` before you finish; it must pass.
5. Do not edit `src/avatar.js`, and leave `src/avatar.smoke.test.js` in place.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "profile-media",
  "version": "0.9.3",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/avatar.js ===============
'use strict';

// Uploads are measured in bytes. The published limit of "5 MB" is stored
// binary: 5 MiB, i.e. 5 * 1024 * 1024 bytes. Anything under 1 KiB is treated
// as a truncated upload. Both limits are inclusive.
const MIN_BYTES = 1024; // 1 KiB
const MAX_BYTES = 5 * 1024 * 1024; // 5 MiB

function validateAvatar(byteLength) {
  if (!Number.isSafeInteger(byteLength) || byteLength < 0) {
    return { ok: false, code: 'BAD_BYTE_LENGTH' };
  }
  if (byteLength < MIN_BYTES) {
    return { ok: false, code: 'TOO_SMALL' };
  }
  if (byteLength > MAX_BYTES) {
    return { ok: false, code: 'TOO_LARGE' };
  }
  return { ok: true, code: null };
}

module.exports = { validateAvatar, MIN_BYTES, MAX_BYTES };

=============== FILE: src/avatar.smoke.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAvatar } = require('./avatar');

test('accepts an ordinary avatar', () => {
  assert.deepEqual(validateAvatar(64 * 1024), { ok: true, code: null });
});
