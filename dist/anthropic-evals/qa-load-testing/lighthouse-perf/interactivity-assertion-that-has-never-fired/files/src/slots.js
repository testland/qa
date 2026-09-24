const OPENING = { start: 17 * 60, end: 22 * 60 };

export function slotsFor(durationMins, stepMins = 30) {
  if (!Number.isInteger(durationMins) || durationMins <= 0) {
    throw new RangeError('duration must be a positive whole number of minutes');
  }
  const out = [];
  for (let t = OPENING.start; t + durationMins <= OPENING.end; t += stepMins) {
    out.push(label(t));
  }
  return out;
}

export function label(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
