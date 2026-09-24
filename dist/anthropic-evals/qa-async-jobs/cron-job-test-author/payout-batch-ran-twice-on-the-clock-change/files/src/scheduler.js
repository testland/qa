'use strict';

function localParts(utcMs, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const p = {};
  for (const part of fmt.formatToParts(new Date(utcMs))) {
    if (part.type !== 'literal') p[part.type] = part.value;
  }
  return {
    year: +p.year,
    month: +p.month,
    day: +p.day,
    hour: +p.hour % 24,
    minute: +p.minute,
  };
}

// Every minute, read the clock in the job's zone and start the job on a match.
function firingsBetween(job, startUtcMs, endUtcMs) {
  const out = [];
  for (let t = startUtcMs; t < endUtcMs; t += 60000) {
    const p = localParts(t, job.timeZone);
    if (p.hour === job.hour && p.minute === job.minute) out.push(new Date(t).toISOString());
  }
  return out;
}

// Firing instants (ISO, UTC) whose local calendar date in the job's zone is isoDate.
function firingsOnLocalDate(job, isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const anchor = Date.UTC(y, m - 1, d);
  return firingsBetween(job, anchor - 18 * 3600000, anchor + 30 * 3600000).filter((iso) => {
    const p = localParts(Date.parse(iso), job.timeZone);
    return p.year === y && p.month === m && p.day === d;
  });
}

module.exports = { localParts, firingsBetween, firingsOnLocalDate };
