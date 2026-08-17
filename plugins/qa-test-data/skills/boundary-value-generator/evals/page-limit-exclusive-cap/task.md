# Paging parameters: the cap and the missing ceiling are both untested

## Problem Description

`src/pagination.js` parses the two paging parameters on the reports feed. The
rules are written at the top of the file: the page size has a floor and a cap,
and the offset has a floor but no documented ceiling at all.

Two things pushed this up the list. An integration partner built against our
docs, sent the cap as their page size, and got a rejection they insisted was a
bug on our side - and we could not point at a test either way. Separately, a
crawler sent an enormous offset, the service returned rows for a page that
does not exist, and the incident review asked what the largest offset we
accept actually is. Nobody had an answer, because "no documented maximum" got
treated as "nothing to test".

The suite has one test using an ordinary page size.

## Output Specification

1. Add `src/pagination.test.js` giving both parameters systematic edge
   coverage, including the offset - a parameter with no stated maximum still
   has a largest value this runtime can hold exactly, and the module says so.
2. Emit the cases as data: one table of input-and-expected rows per parameter,
   driven through a loop that registers an individually named case per row,
   rather than a run of copy-pasted test bodies that differ only in a number.
   Each case name must contain the value it covers, so a failure in the runner
   output identifies the input without opening the file.
3. Every rejecting case asserts the specific code, not merely that parsing
   failed.
4. Run `npm test` before you finish; it must pass.
5. Do not edit `src/pagination.js`, and leave `src/pagination.smoke.test.js`
   in place.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "reports-feed",
  "version": "1.12.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/pagination.js ===============
'use strict';

// Query parameters for the reports feed.
//   limit:  an integer, at least 1 and strictly less than 100. The cap itself
//           is not an accepted page size.
//   offset: an integer, at least 0. There is no product maximum; the only
//           ceiling is exact integer representation, so anything that is not
//           a safe integer is refused.
const MIN_LIMIT = 1;
const LIMIT_EXCLUSIVE_MAX = 100;

function parsePageParams(input) {
  if (!input || typeof input !== 'object') {
    return { ok: false, code: 'MALFORMED' };
  }
  const { limit, offset } = input;
  if (!Number.isInteger(limit)) {
    return { ok: false, code: 'LIMIT_NOT_INTEGER' };
  }
  if (limit < MIN_LIMIT) {
    return { ok: false, code: 'LIMIT_TOO_SMALL' };
  }
  if (limit >= LIMIT_EXCLUSIVE_MAX) {
    return { ok: false, code: 'LIMIT_TOO_LARGE' };
  }
  if (!Number.isSafeInteger(offset)) {
    return { ok: false, code: 'OFFSET_NOT_SAFE_INTEGER' };
  }
  if (offset < 0) {
    return { ok: false, code: 'OFFSET_NEGATIVE' };
  }
  return { ok: true, code: null, limit, offset };
}

module.exports = { parsePageParams, MIN_LIMIT, LIMIT_EXCLUSIVE_MAX };

=============== FILE: src/pagination.smoke.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePageParams } = require('./pagination');

test('accepts an ordinary page request', () => {
  const result = parsePageParams({ limit: 25, offset: 0 });
  assert.deepEqual(result, { ok: true, code: null, limit: 25, offset: 0 });
});
