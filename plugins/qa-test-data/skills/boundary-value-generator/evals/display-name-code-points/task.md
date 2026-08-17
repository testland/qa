# Display-name limits have never been tested with anything but plain letters

## Problem Description

`src/display-name.js` enforces two separate limits on a profile display name:
a product limit on how many characters a name may contain, and a storage
limit imposed by the column the name is written to. The two limits count in
different units, and the file says which is which.

The bug that started this: a user in Japan set a name of well under twenty
characters and got a rejection our support team could not explain, because the
name was obviously short. A second user set a name that looked like five
characters to everyone who saw the screenshot and was told it was too long.

Every test we have uses lowercase ASCII, which is exactly the input for which
the two units cannot be told apart, so the suite has never once distinguished
them.

## Output Specification

1. Add `src/display-name.test.js` giving both limits systematic edge coverage.
2. The storage limit must actually be reached by at least one case - work out
   what kind of input can reach it without tripping the character limit first.
3. Include at least one name whose visible character count, as a person would
   count it on screen, differs from the count this module uses, and record in
   a test name or comment which count the module applies.
4. Every rejecting case asserts the specific code, not merely that the name
   was refused.
5. Run `npm test` before you finish; it must pass.
6. Do not edit `src/display-name.js`, and leave `src/display-name.smoke.test.js`
   in place.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "profiles-api",
  "version": "2.0.1",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/display-name.js ===============
'use strict';

// Product limit: a display name holds 1 to 24 characters, where a character
// means one Unicode code point. Both endpoints are included.
// Storage limit: the column holds 40 UTF-16 code units, inclusive. It is
// checked only after the product limit passes.
const MIN_CODE_POINTS = 1;
const MAX_CODE_POINTS = 24;
const MAX_UTF16_UNITS = 40;

function validateDisplayName(value) {
  if (typeof value !== 'string') {
    return { ok: false, code: 'NOT_A_STRING', codePoints: null, utf16Units: null };
  }
  const codePoints = Array.from(value).length;
  const utf16Units = value.length;
  if (codePoints < MIN_CODE_POINTS) {
    return { ok: false, code: 'TOO_SHORT', codePoints, utf16Units };
  }
  if (codePoints > MAX_CODE_POINTS) {
    return { ok: false, code: 'TOO_LONG', codePoints, utf16Units };
  }
  if (utf16Units > MAX_UTF16_UNITS) {
    return { ok: false, code: 'STORAGE_OVERFLOW', codePoints, utf16Units };
  }
  return { ok: true, code: null, codePoints, utf16Units };
}

module.exports = {
  validateDisplayName,
  MIN_CODE_POINTS,
  MAX_CODE_POINTS,
  MAX_UTF16_UNITS,
};

=============== FILE: src/display-name.smoke.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateDisplayName } = require('./display-name');

test('accepts an ordinary display name', () => {
  const result = validateDisplayName('ada');
  assert.equal(result.ok, true);
  assert.equal(result.code, null);
});
