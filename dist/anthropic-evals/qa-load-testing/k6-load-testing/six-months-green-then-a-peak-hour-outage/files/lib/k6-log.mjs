const UNIT_MS = { h: 3600000, m: 60000, s: 1000, ms: 1, 'µs': 0.001, us: 0.001, ns: 0.000001 };

const METRIC_LINE = /^\s*(✓|✗)?\s*([a-z0-9_]+)\.{2,}:\s*(.*)$/;
const RUNNING_LINE =
  /^running \((.+?)\),\s*(\d+)\/(\d+) VUs,\s*(\d+) complete and (\d+) interrupted iterations/;

export function toMs(text) {
  const parts = String(text ?? '').match(/(\d+(?:\.\d+)?)(h|ms|µs|us|ns|m|s)/g);
  if (!parts) return NaN;
  let total = 0;
  for (const part of parts) {
    const [, n, unit] = /^(\d+(?:\.\d+)?)(h|ms|µs|us|ns|m|s)$/.exec(part);
    total += Number(n) * UNIT_MS[unit];
  }
  return total;
}

export function parseSummary(text) {
  const metrics = {};
  let running = null;

  for (const line of String(text).split('\n')) {
    const r = RUNNING_LINE.exec(line.trim());
    if (r) {
      running = {
        duration: r[1],
        durationMs: toMs(r[1]),
        activeVus: Number(r[2]),
        maxVus: Number(r[3]),
        complete: Number(r[4]),
        interrupted: Number(r[5]),
      };
      continue;
    }
    const m = METRIC_LINE.exec(line);
    if (!m) continue;
    const values = {};
    for (const token of m[3].trim().split(/\s+/)) {
      const kv = /^([a-z0-9()._]+)=(.+)$/i.exec(token);
      if (kv) values[kv[1]] = kv[2];
    }
    metrics[m[2]] = { mark: m[1] ?? null, raw: m[3].trim(), values };
  }

  return { metrics, running };
}
