'use strict';

const HORIZON_DAYS = 1500;

const NAMES = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

function token(tok) {
  const named = NAMES[tok.toLowerCase()];
  return named === undefined ? Number(tok) : named;
}

function parseField(raw, lo, hi) {
  const restricted = raw !== '*' && !raw.startsWith('*/');
  const values = new Set();
  for (const part of raw.split(',')) {
    const [spec, stepRaw] = part.split('/');
    const step = stepRaw === undefined ? 1 : Number(stepRaw);
    let from;
    let to;
    if (spec === '*') {
      from = lo;
      to = hi;
    } else if (spec.includes('-')) {
      const [a, b] = spec.split('-');
      from = token(a);
      to = token(b);
    } else {
      from = token(spec);
      to = from;
    }
    for (let v = from; v <= to; v += step) values.add(v);
  }
  return { values, restricted };
}

function parseExpr(expr) {
  const f = String(expr).trim().split(/\s+/);
  if (f.length !== 5) throw new Error(`expected 5 fields, got ${f.length}: ${expr}`);
  return {
    minute: parseField(f[0], 0, 59),
    hour: parseField(f[1], 0, 23),
    dom: parseField(f[2], 1, 31),
    month: parseField(f[3], 1, 12),
    dow: parseField(f[4], 0, 7),
  };
}

function dateMatches(d, p) {
  if (!p.month.values.has(d.getUTCMonth() + 1)) return false;
  const domOk = p.dom.values.has(d.getUTCDate());
  const dowOk = p.dow.values.has(d.getUTCDay());
  if (p.dom.restricted && p.dow.restricted) return domOk || dowOk;
  if (p.dom.restricted) return domOk;
  if (p.dow.restricted) return dowOk;
  return true;
}

// The next instant after fromMs on which this expression fires, or null if it
// does not come round again inside the horizon.
function nextRunUtc(expr, fromMs, horizonDays = HORIZON_DAYS) {
  const p = parseExpr(expr);
  const limit = fromMs + horizonDays * 86400000;
  let t = new Date(Math.floor(fromMs / 60000) * 60000 + 60000);
  while (t.getTime() <= limit) {
    if (!dateMatches(t, p)) {
      t = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + 1));
      continue;
    }
    if (p.hour.values.has(t.getUTCHours()) && p.minute.values.has(t.getUTCMinutes())) return t;
    t = new Date(t.getTime() + 60000);
  }
  return null;
}

module.exports = { parseExpr, nextRunUtc, HORIZON_DAYS };
