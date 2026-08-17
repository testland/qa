# Quiet-hours suppression has no coverage at either end of the window

## Problem Description

`src/quiet-hours.js` decides whether a push notification is suppressed. The
window is expressed in the recipient's own wall clock, and the module reads
that wall clock out of a UTC instant.

Two complaints, seven months apart, from the same New York account: one user
was pinged just after the window should have opened in November, and another
got nothing in the morning of a July day when the window should already have
closed. Support could not reproduce either because whatever they tried worked
on the day they tried it.

Nobody has tested either end of the window, and the only test we have is one
mid-afternoon instant.

## Output Specification

1. Add `src/quiet-hours.test.js` giving both ends of the window systematic
   edge coverage, using UTC instants and the `America/New_York` zone.
2. The suite must hold up whatever date it is run on, whatever machine runs
   it, and whichever part of the year the recipient's clock is in.
3. Run `npm test` before you finish; it must pass.
4. Do not edit `src/quiet-hours.js`, and leave `src/quiet-hours.smoke.test.js`
   in place.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "notify-gateway",
  "version": "1.4.0",
  "private": true,
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: src/quiet-hours.js ===============
'use strict';

// Notifications are suppressed during the recipient's local quiet hours:
// from 22:00:00.000 local time, included, until 07:00:00.000 local time the
// next morning, excluded.
const QUIET_START_MS = 22 * 3600 * 1000; // 22:00:00.000 local, included
const QUIET_END_MS = 7 * 3600 * 1000; // 07:00:00.000 local, excluded

// Every zone this product supports is offset by a whole number of minutes, so
// the millisecond field is the same locally as it is in UTC.
function localMsOfDay(instantIso, timeZone) {
  const at = new Date(instantIso);
  if (Number.isNaN(at.getTime())) {
    return null;
  }
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const part = {};
  for (const piece of fmt.formatToParts(at)) {
    if (piece.type !== 'literal') {
      part[piece.type] = Number(piece.value);
    }
  }
  const seconds = (part.hour * 60 + part.minute) * 60 + part.second;
  return seconds * 1000 + at.getUTCMilliseconds();
}

function isQuietHours(instantIso, timeZone) {
  const msOfDay = localMsOfDay(instantIso, timeZone);
  if (msOfDay === null) {
    return { quiet: null, code: 'BAD_INSTANT' };
  }
  const quiet = msOfDay >= QUIET_START_MS || msOfDay < QUIET_END_MS;
  return { quiet, code: null };
}

module.exports = { isQuietHours, localMsOfDay, QUIET_START_MS, QUIET_END_MS };

=============== FILE: src/quiet-hours.smoke.test.js ===============
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isQuietHours } = require('./quiet-hours');

test('a mid-afternoon instant is not quiet hours', () => {
  const result = isQuietHours('2026-01-15T18:00:00.000Z', 'America/New_York');
  assert.deepEqual(result, { quiet: false, code: null });
});
