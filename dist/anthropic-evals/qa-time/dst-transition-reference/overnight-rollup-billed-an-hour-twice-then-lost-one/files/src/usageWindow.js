'use strict';

const HOUR_MS = 3600000;

const BILLED_ZONES = [
  'America/New_York',
  'Europe/London',
  'Asia/Kolkata',
  'America/Havana',
  'Australia/Lord_Howe',
];

// Offset of `zone` from UTC at `instant`, in milliseconds.
function zoneOffsetMs(zone, instant) {
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
  return asIfUtc - instant.getTime();
}

// "2026-06-15T00:00:00" in `zone` -> the UTC instant it names.
function localToInstant(wallClock, zone) {
  const naive = Date.parse(wallClock + 'Z');
  let ts = naive - zoneOffsetMs(zone, new Date(naive));
  ts = naive - zoneOffsetMs(zone, new Date(ts));
  return new Date(ts);
}

function dayWindow(localDate, zone) {
  const start = localToInstant(localDate + 'T00:00:00', zone);
  const end = new Date(start.getTime() + 24 * HOUR_MS);
  return { start, end };
}

function billableSeconds(sessions, localDate, zone) {
  const { start, end } = dayWindow(localDate, zone);
  let total = 0;
  for (const s of sessions) {
    const from = Math.max(Date.parse(s.start), start.getTime());
    const to = Math.min(Date.parse(s.end), end.getTime());
    if (to > from) total += (to - from) / 1000;
  }
  return total;
}

module.exports = { dayWindow, billableSeconds, localToInstant, zoneOffsetMs, BILLED_ZONES };
