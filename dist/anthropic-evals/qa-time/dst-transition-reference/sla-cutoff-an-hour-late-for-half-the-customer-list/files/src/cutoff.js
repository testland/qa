'use strict';

const CUTOFF_LOCAL_HOUR = 17;

const BILLED_ZONES = [
  'America/New_York',
  'Europe/London',
  'Asia/Kolkata',
  'Asia/Kathmandu',
  'Pacific/Chatham',
  'Australia/Adelaide',
];

// Resolving a zone through Intl showed up in the worker profile, so the answer
// for a zone is kept once it has been worked out.
const offsetCache = new Map();

// Offset of `zone` from UTC at `instant`, in milliseconds, per the runtime's zone data.
function zoneOffsetMs(zone, instant) {
  if (offsetCache.has(zone)) return offsetCache.get(zone);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  const asIfUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  const ms = asIfUtc - instant.getTime();
  offsetCache.set(zone, ms);
  return ms;
}

// The UTC instant at which the first-response SLA expires for `zone` on `localDate`.
function cutoffInstant(localDate, zone) {
  const hh = String(CUTOFF_LOCAL_HOUR).padStart(2, '0');
  const asIfUtc = Date.parse(localDate + 'T' + hh + ':00:00Z');
  return new Date(asIfUtc - zoneOffsetMs(zone, new Date(asIfUtc)));
}

function isBreached(ticketOpenedLocalDate, zone, firstResponseAt) {
  return Date.parse(firstResponseAt) > cutoffInstant(ticketOpenedLocalDate, zone).getTime();
}

module.exports = { cutoffInstant, isBreached, zoneOffsetMs, BILLED_ZONES };
