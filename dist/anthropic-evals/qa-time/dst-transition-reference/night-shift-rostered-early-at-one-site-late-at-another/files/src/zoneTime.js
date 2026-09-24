'use strict';

function parts(zone, instant) {
  const list = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  return Object.fromEntries(list.map((x) => [x.type, x.value]));
}

// Offset of `zone` from UTC at `instant`, in milliseconds.
function zoneOffsetMs(zone, instant) {
  const p = parts(zone, instant);
  const asIfUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asIfUtc - instant.getTime();
}

// The local wall clock in zone at instant, as YYYY-MM-DDTHH:mm:ss.
function localLabel(instant, zone) {
  const p = parts(zone, instant);
  const hh = String(+p.hour % 24).padStart(2, '0');
  return p.year + '-' + p.month + '-' + p.day + 'T' + hh + ':' + p.minute + ':' + p.second;
}

// A local wall clock reading in zone -> the UTC instant it names.
function localToInstant(wallClock, zone) {
  const naive = Date.parse(wallClock + 'Z');
  let ts = naive - zoneOffsetMs(zone, new Date(naive));
  ts = naive - zoneOffsetMs(zone, new Date(ts));
  return new Date(ts);
}

module.exports = { zoneOffsetMs, localLabel, localToInstant };
