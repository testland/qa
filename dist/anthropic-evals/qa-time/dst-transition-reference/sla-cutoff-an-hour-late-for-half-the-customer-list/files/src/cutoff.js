'use strict';

const HOUR_MS = 3600000;
const CUTOFF_LOCAL_HOUR = 17;

const BILLED_ZONES = [
  'America/New_York',
  'Europe/London',
  'Asia/Kolkata',
  'Asia/Kathmandu',
  'Pacific/Chatham',
  'Australia/Adelaide',
];

// How many hours `zone` is ahead of UTC at `instant`, per the runtime's zone data.
function offsetHours(zone, instant) {
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
  return Math.round((asIfUtc - instant.getTime()) / HOUR_MS);
}

// The UTC instant at which the first-response SLA expires for `zone` on `localDate`.
function cutoffInstant(localDate, zone) {
  const asIfUtc = Date.parse(localDate + 'T' + String(CUTOFF_LOCAL_HOUR).padStart(2, '0') + ':00:00Z');
  const offset = offsetHours(zone, new Date(asIfUtc));
  return new Date(asIfUtc - offset * HOUR_MS);
}

function isBreached(ticketOpenedLocalDate, zone, firstResponseAt) {
  return Date.parse(firstResponseAt) > cutoffInstant(ticketOpenedLocalDate, zone).getTime();
}

module.exports = { cutoffInstant, isBreached, offsetHours, BILLED_ZONES };
