'use strict';

// Offset of `zone` from UTC at `instant`, in whole minutes.
function offsetMinutes(zone, instant) {
  const at = new Date(instant);
  const list = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const p = Object.fromEntries(list.map((x) => [x.type, x.value]));
  const asIfUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return (asIfUtc - at.getTime()) / 60000;
}

module.exports = { offsetMinutes };
