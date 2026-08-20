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
